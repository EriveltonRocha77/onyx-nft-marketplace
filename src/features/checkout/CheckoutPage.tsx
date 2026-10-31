import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '../../shared/api/errors';
import { quoteSchema, type Cart, type Network, type Profile, type Quote, type Wallet } from '../../shared/api/schemas';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import { formatEthDisplay } from '../../shared/money/decimal';
import { Button, buttonVariants } from '../../shared/ui/button';
import { cn } from '../../shared/ui/cn';
import { FormErrorSummary } from '../../shared/ui/form-error-summary';
import { FormField } from '../../shared/ui/form-field';
import { Input } from '../../shared/ui/input';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { Skeleton } from '../../shared/ui/skeleton';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { formatCpf, isValidCpf } from '../../shared/validation/cpf';
import { useSession } from '../auth/api';
import { loadDraft, removeDraft, saveDraft } from '../auth/session';
import { useApiFormErrors } from '../auth/useAuthForm';
import { useQueryClient } from '@tanstack/react-query';
import { useCart, useCartScope, useSetNetwork } from '../cart/api';
import { SummaryPanel } from '../cart/SummaryPanel';
import { useProfile } from '../profile/api';
import { networkLabels, shortAddress, useWallets } from '../wallets/api';
import { WalletConnection } from '../wallets/WalletsPage';
import { isTransient, useCreateOrder, useCreateQuote, type OrderBody } from './api';

const formSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.'),
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  document: z.string().trim().min(1, 'Informe seu CPF.').refine(isValidCpf, 'Informe um CPF válido.'),
  walletId: z.string().min(1, 'Selecione uma carteira.'),
});
type FormValues = z.infer<typeof formSchema>;

interface Attempt { key: string; fingerprint: string; body: OrderBody }
const FORM_DRAFT = 'checkout-form';
const ATTEMPT_DRAFT = 'checkout-attempt';
const NETWORKS: Network[] = ['ethereum', 'polygon', 'base'];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <h2 id={id} className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

function CheckoutSkeleton() {
  return (
    <div role="status" aria-label="Carregando pagamento" className="grid gap-6 lg:grid-cols-[1fr_380px]" data-testid="checkout-skeleton">
      <div className="flex flex-col gap-4">{[260, 220, 140].map((h) => <Skeleton key={h} className="w-full rounded-2xl" style={{ height: h }} />)}</div>
      <SummaryPanel summary={undefined} />
    </div>
  );
}

export function CheckoutPage() {
  usePageTitle('Pagamento');
  const cart = useCart();
  const wallets = useWallets();
  const profile = useProfile();
  const { user } = useSession();
  const attempt = user ? (loadDraft(user.id, ATTEMPT_DRAFT) as Attempt | null) : null;

  if (cart.isPending || wallets.isPending || profile.isPending) return <div className="flex flex-col gap-6"><h1 className="text-3xl">Pagamento</h1><CheckoutSkeleton /></div>;
  const failed = cart.error ?? wallets.error ?? profile.error;
  if (!cart.data || !wallets.data || !profile.data) {
    return <ErrorState error={failed} title="Não foi possível carregar o pagamento" onRetry={() => { void cart.refetch(); void wallets.refetch(); void profile.refetch(); }} />;
  }
  if (cart.data.items.length === 0 && !attempt) {
    return <EmptyState title="Seu carrinho está vazio" description="Adicione NFTs para ir ao pagamento." action={<Link to="/" className={cn(buttonVariants())}>Explorar catálogo</Link>} />;
  }
  return <CheckoutFlow userId={user!.id} cart={cart.data} wallets={wallets.data} profile={profile.data} initialAttempt={attempt} />;
}

interface FlowProps { userId: string; cart: Cart; wallets: Wallet[]; profile: Profile; initialAttempt: Attempt | null }

function CheckoutFlow({ userId, cart, wallets, profile, initialAttempt }: FlowProps) {
  const navigate = useNavigate();
  const announce = useAnnounce();
  const createQuote = useCreateQuote();
  const createOrder = useCreateOrder();
  const setNetwork = useSetNetwork();
  const qc = useQueryClient();
  const cartScope = useCartScope();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<{ message: string; items?: { name: string; requested: number; available: number }[]; unconfirmed?: boolean } | null>(null);
  const submitting = useRef(false);
  const recovered = useRef(false);

  const draft = loadDraft(userId, FORM_DRAFT) as Partial<FormValues> | null;
  const primary = wallets.find((w) => w.role === 'primary') ?? wallets[0];
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: draft?.name ?? profile.name,
      email: draft?.email ?? profile.email,
      document: draft?.document ?? '',
      walletId: wallets.some((w) => w.id === draft?.walletId) ? draft!.walletId! : (primary?.id ?? ''),
    },
  });
  const { formError, setFormError, summaryRef, onInvalid, messages } = useApiFormErrors(form);
  const { errors } = form.formState;

  // rascunho do formulário: permite retomar após expiração de sessão ou refresh
  const values = useWatch({ control: form.control });
  useEffect(() => { saveDraft(userId, FORM_DRAFT, values); }, [values, userId]);

  const walletId = values.walletId ?? '';
  const wallet = wallets.find((w) => w.id === walletId);
  const outdated = quote !== null && (cart.network !== quote.network || cart.summary.totalEth !== quote.summary.totalEth);

  const send = async (a: Attempt) => {
    if (submitting.current) return;
    submitting.current = true;
    setProblem(null);
    setNotice(null);
    saveDraft(userId, ATTEMPT_DRAFT, a);
    try {
      const order = await createOrder.mutateAsync({ key: a.key, body: a.body });
      removeDraft(userId, ATTEMPT_DRAFT);
      removeDraft(userId, FORM_DRAFT);
      announce('Pedido enviado.');
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError({ status: 0, code: 'UNKNOWN', message: 'Erro inesperado.' });
      if (isTransient(err)) {
        // a tentativa continua salva: reenviar com a mesma chave recupera o mesmo pedido
        setProblem({ message: 'Não recebemos a resposta do servidor. Seu pedido pode já ter sido criado; tentar de novo é seguro e não duplica a compra.', unconfirmed: true });
        announce('Sem resposta do servidor. Tente confirmar novamente.', 'assertive');
      } else {
        removeDraft(userId, ATTEMPT_DRAFT);
        if (err.code === 'QUOTE_STALE') {
          const fresh = quoteSchema.safeParse((err.details as { quote?: unknown } | undefined)?.quote);
          if (fresh.success) {
            const before = quote ? formatEthDisplay(quote.summary.totalEth) : null;
            const msg = `Os valores mudaram${before ? `: o total passou de ${before} para ${formatEthDisplay(fresh.data.summary.totalEth)} ETH` : ''}. Revise e confirme novamente.`;
            setQuote(fresh.data);
            setNotice(msg);
            void qc.invalidateQueries({ queryKey: cartScope.key });
            announce(msg, 'assertive');
          } else { setQuote(null); setProblem({ message: err.message }); }
        } else if (err.code === 'AVAILABILITY_CONFLICT') {
          const items = ((err.details as { items?: { name: string; requested: number; available: number }[] } | undefined)?.items) ?? [];
          setQuote(null);
          setProblem({ message: err.message, items });
          announce(err.message, 'assertive');
        } else {
          setProblem({ message: err.message });
          announce(err.message, 'assertive');
        }
      }
    } finally {
      submitting.current = false;
    }
  };

  // tentativa interrompida (refresh, expiração, timeout): reenvia com a mesma chave
  useEffect(() => {
    if (initialAttempt && !recovered.current) {
      recovered.current = true;
      void send(initialAttempt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const review = form.handleSubmit(async (v) => {
    setFormError(null);
    setProblem(null);
    if (!wallet?.connected) { form.setError('walletId', { message: 'Conecte a carteira para continuar.' }); onInvalid({}); return; }
    try {
      const q = await createQuote.mutateAsync({ network: cart.network, walletId: v.walletId });
      setQuote(q);
      setNotice(null);
      announce('Revise seu pedido antes de confirmar.');
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      if (err?.code === 'AVAILABILITY_CONFLICT') {
        setProblem({ message: err.message, items: (err.details as { items?: { name: string; requested: number; available: number }[] } | undefined)?.items ?? [] });
      } else setProblem({ message: err?.message ?? 'Não foi possível calcular a cotação.' });
    }
  }, onInvalid);

  const confirm = () => {
    if (!quote || !wallet) return;
    const v = form.getValues();
    const body: OrderBody = { quoteId: quote.quoteId, walletId: wallet.id, network: quote.network, collector: { name: v.name.trim(), email: v.email.trim(), document: v.document.trim() } };
    const fingerprint = JSON.stringify(body);
    const saved = loadDraft(userId, ATTEMPT_DRAFT) as Attempt | null;
    const key = saved && saved.fingerprint === fingerprint ? saved.key : globalThis.crypto.randomUUID();
    void send({ key, fingerprint, body });
  };

  const recovering = createOrder.isPending && initialAttempt !== null && quote === null;
  const sending = createOrder.isPending;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">Pagamento</h1>
      {recovering ? <p role="status" className="rounded-xl border border-border bg-surface p-3 text-sm" data-testid="checkout-recovering">Recuperando seu pedido em andamento…</p> : null}
      {notice ? <p role="alert" className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning" data-testid="quote-changed">⚠ {notice}</p> : null}
      {problem ? (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm" data-testid="checkout-problem">
          <p className="text-danger">⚠ {problem.message}</p>
          {problem.items?.length ? <ul className="list-inside list-disc">{problem.items.map((i) => <li key={i.name}>{i.name}: pediu {i.requested}, disponível {i.available}</li>)}</ul> : null}
          <div className="flex flex-wrap gap-2">
            {problem.unconfirmed ? <Button type="button" size="sm" onClick={confirm} disabled={sending} data-testid="retry-order">Tentar confirmar novamente</Button> : null}
            {problem.items ? <Link to="/cart" className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }))}>Ajustar carrinho</Link> : null}
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {quote === null ? (
          <form noValidate onSubmit={review} className="flex flex-col gap-4" aria-label="Dados do pedido">
            <FormErrorSummary ref={summaryRef} message={formError} errors={messages} />
            <Section id="colecionador-titulo" title="Dados do colecionador">
              <FormField label="Nome completo" error={errors.name?.message}>{(p) => <Input autoComplete="name" {...p} {...form.register('name')} />}</FormField>
              <FormField label="E-mail" error={errors.email?.message}>{(p) => <Input type="email" autoComplete="email" {...p} {...form.register('email')} />}</FormField>
              <FormField label="CPF" error={errors.document?.message} hint="Usado apenas no recibo simulado.">
                {(p) => <Input inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" {...p} {...form.register('document', { onChange: (e) => { e.target.value = formatCpf(e.target.value); } })} />}
              </FormField>
            </Section>
            <Section id="carteira-titulo" title="Carteira e rede">
              {wallets.length === 0 ? (
                <p className="text-sm text-muted">Você ainda não tem carteiras. <Link to="/wallets" className="text-accent underline underline-offset-4">Cadastrar carteira</Link></p>
              ) : (
                <fieldset className="flex flex-col gap-2" aria-describedby={errors.walletId ? 'wallet-error' : undefined}>
                  <legend className="mb-1 text-sm font-medium">Carteira</legend>
                  {wallets.map((w) => (
                    <label key={w.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm has-[:checked]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                      <input type="radio" value={w.id} className="mt-1 accent-[var(--color-accent)]" {...form.register('walletId')} />
                      <span className="flex-1">
                        <span className="block font-medium">{w.label} <span className="font-normal text-muted">· {w.role === 'primary' ? 'Principal' : 'Secundária'}</span></span>
                        <span className="block font-mono text-xs text-muted">{shortAddress(w.address)}</span>
                        <span className="block text-xs" data-testid={`wallet-state-${w.id}`}>{w.connected ? '● Conectada' : '○ Desconectada'}</span>
                      </span>
                    </label>
                  ))}
                  {errors.walletId ? <p id="wallet-error" className="flex items-center gap-1 text-sm text-danger"><span aria-hidden="true">⚠</span>{errors.walletId.message}</p> : null}
                  {wallet ? <WalletConnection wallet={wallet} /> : null}
                </fieldset>
              )}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Rede</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {NETWORKS.map((n) => (
                    <label key={n} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                      <input type="radio" name="rede" value={n} checked={cart.network === n} disabled={setNetwork.isPending} onChange={() => setNetwork.mutate({ network: n })} className="accent-[var(--color-accent)]" />
                      {networkLabels[n]}
                    </label>
                  ))}
                </div>
                {setNetwork.isError ? <p role="alert" className="text-sm text-danger">⚠ {setNetwork.error.message}</p> : null}
              </fieldset>
            </Section>
            <Button type="submit" size="lg" disabled={createQuote.isPending || wallets.length === 0}>{createQuote.isPending ? 'Calculando…' : 'Revisar pedido'}</Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4" data-testid="review">
            <Section id="revisao-titulo" title="Revise seu pedido">
              {outdated ? (
                <p role="alert" className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning" data-testid="quote-outdated">
                  ⚠ O carrinho mudou desde a revisão. Atualize a cotação para continuar.
                </p>
              ) : null}
              <ul className="flex flex-col divide-y divide-border">
                {quote.lines.map((l) => (
                  <li key={`${l.nftId}:${l.editionId}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0" data-testid="review-line">
                    <div><p className="font-medium">{l.name}</p><p className="text-xs text-muted">{l.editionLabel} · {l.quantity} × {formatEthDisplay(l.unitPriceEth)} ETH</p></div>
                    <p className="shrink-0">{formatEthDisplay(l.lineTotalEth)} ETH</p>
                  </li>
                ))}
              </ul>
              <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Colecionador</dt><dd>{form.getValues('name')}</dd></div>
                <div><dt className="text-muted">E-mail</dt><dd>{form.getValues('email')}</dd></div>
                <div><dt className="text-muted">CPF</dt><dd>{form.getValues('document')}</dd></div>
                <div><dt className="text-muted">Rede</dt><dd>{networkLabels[quote.network]}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted">Carteira</dt><dd>{wallet?.label} <span className="font-mono text-xs text-muted">{wallet ? shortAddress(wallet.address) : ''}</span></dd></div>
              </dl>
            </Section>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => { setQuote(null); setNotice(null); }} disabled={sending}>Voltar e editar</Button>
              {outdated ? (
                <Button type="button" onClick={() => void createQuote.mutateAsync({ network: cart.network, walletId }).then((q) => { setQuote(q); announce('Cotação atualizada.'); })} disabled={createQuote.isPending}>Atualizar cotação</Button>
              ) : null}
            </div>
          </div>
        )}

        <SummaryPanel summary={quote ? quote.summary : cart.summary} networkLabel={networkLabels[quote ? quote.network : cart.network]} busy={setNetwork.isPending}>
          {quote ? (
            <Button type="button" size="lg" onClick={confirm} disabled={sending || outdated} aria-busy={sending} data-testid="confirm-order">
              {sending ? 'Enviando pedido…' : 'Confirmar e pagar'}
            </Button>
          ) : null}
        </SummaryPanel>
      </div>
    </div>
  );
}
