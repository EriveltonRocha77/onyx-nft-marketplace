import { ptBR, type Messages } from './pt-BR';

export type MessageKey = keyof Messages;
export const locale = 'pt-BR';
const dictionary: Messages = ptBR;

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template: string = dictionary[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
