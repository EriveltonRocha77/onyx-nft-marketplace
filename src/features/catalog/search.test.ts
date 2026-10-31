import { describe, expect, it } from 'vitest';
import { catalogSearchSchema, normalizeSearch, toApiParams, withFilterChange } from './search';

const parse = (raw: unknown) => normalizeSearch(catalogSearchSchema.parse(raw));

describe('parâmetros de busca do catálogo', () => {
  it.each([-1, 'abc', 0, 2.5, null])('page=%j vira 1', (page) => {
    expect(parse({ page }).page).toBe(1);
  });
  it('page válida é preservada', () => expect(parse({ page: 3 }).page).toBe(3));
  it('sort inválido vira newest', () => expect(parse({ sort: 'foo' }).sort).toBe('newest'));
  it('minPrice maior que maxPrice é invertido', () => {
    const s = parse({ minPrice: '2', maxPrice: '1' });
    expect([s.minPrice, s.maxPrice]).toEqual(['1', '2']);
  });
  it('q em branco vira vazio e q com emoji, % e espaços é aparado e preservado', () => {
    expect(parse({ q: '   ' }).q).toBe('');
    expect(parse({ q: '  100% ✨ lume ' }).q).toBe('100% ✨ lume');
  });
  it('q numérico (JSON do router) vira string', () => expect(parse({ q: 123 }).q).toBe('123'));
  it('preço em notação científica ou negativo é descartado', () => {
    expect(parse({ minPrice: '1e-3' }).minPrice).toBeUndefined();
    expect(parse({ maxPrice: '-5' }).maxPrice).toBeUndefined();
  });
  it('preço numérico do router vira string decimal', () => expect(parse({ minPrice: 0.5 }).minPrice).toBe('0.5'));
  it('availability e favorites inválidos são descartados', () => {
    expect(parse({ availability: 'x', favorites: 'x' }).availability).toBeUndefined();
    expect(parse({ favorites: 'x' }).favorites).toBeUndefined();
  });

  it('mudar filtro zera a página', () => {
    const prev = parse({ page: 3, q: 'a' });
    expect(normalizeSearch(withFilterChange(prev, { category: 'art' })).page).toBe(1);
    expect(normalizeSearch(withFilterChange(prev, { sort: 'name' })).page).toBe(1);
    expect(normalizeSearch(withFilterChange(prev, { q: 'b' })).page).toBe(1);
  });
  it('mudar só a página preserva a página', () => {
    expect(normalizeSearch(withFilterChange(parse({ page: 3 }), { page: 4 })).page).toBe(4);
  });
  it('withFilterChange remove valores padrão da URL', () => {
    const next = withFilterChange(parse({ category: 'art' }), { category: undefined });
    expect(next).toEqual({});
  });

  it('toApiParams não emite campos vazios e inclui paginação', () => {
    expect(toApiParams(parse({}))).toEqual({ sort: 'newest', page: '1', pageSize: '12' });
    expect(toApiParams(parse({ q: 'sol', category: 'art', page: 2, favorites: true, availability: 'available' }))).toEqual({
      q: 'sol', category: 'art', page: '2', pageSize: '12', sort: 'newest', favorites: 'true', availability: 'available',
    });
  });
});
