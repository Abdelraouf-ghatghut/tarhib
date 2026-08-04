import { computeOrderRequestHash } from './order-request-hash';

describe('computeOrderRequestHash (D8)', () => {
  it("produit la même empreinte quel que soit l'ordre des lignes", () => {
    const a = computeOrderRequestHash(
      [
        { productId: 'p2', quantity: 1 },
        { productId: 'p1', quantity: 3 },
      ],
      null,
    );
    const b = computeOrderRequestHash(
      [
        { productId: 'p1', quantity: 3 },
        { productId: 'p2', quantity: 1 },
      ],
      null,
    );
    expect(a).toBe(b);
  });

  it('change si une quantité change', () => {
    const a = computeOrderRequestHash([{ productId: 'p1', quantity: 1 }], null);
    const b = computeOrderRequestHash([{ productId: 'p1', quantity: 2 }], null);
    expect(a).not.toBe(b);
  });

  it('change si un produit change', () => {
    const a = computeOrderRequestHash([{ productId: 'p1', quantity: 1 }], null);
    const b = computeOrderRequestHash([{ productId: 'p2', quantity: 1 }], null);
    expect(a).not.toBe(b);
  });

  it("la note fait partie de l'empreinte (normalisée : trim, vide = null)", () => {
    const lines = [{ productId: 'p1', quantity: 1 }];
    const withNote = computeOrderRequestHash(lines, 'urgent');
    const withoutNote = computeOrderRequestHash(lines, null);
    const trimmedNote = computeOrderRequestHash(lines, '  urgent  ');
    const emptyNote = computeOrderRequestHash(lines, '   ');

    expect(withNote).not.toBe(withoutNote);
    expect(withNote).toBe(trimmedNote); // normalisée
    expect(emptyNote).toBe(withoutNote); // note vide ≡ pas de note
  });

  it('est déterministe (même entrée → même sortie, format sha256 hex)', () => {
    const h = computeOrderRequestHash([{ productId: 'p1', quantity: 1 }], null);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(
      computeOrderRequestHash([{ productId: 'p1', quantity: 1 }], null),
    ).toBe(h);
  });
});
