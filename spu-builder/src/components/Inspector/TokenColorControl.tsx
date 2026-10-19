import styles from './TokenColorControl.module.css';

const TOKEN_COLORS: Record<string, string[]> = {
  petrol: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
  terra: ['50', '100', '200', '300', '400', '500', '600', '700', '800'],
  ochre: ['50', '100', '200', '300', '400', '500', '600', '700', '800'],
  green: ['100', '400', '600', '700'],
  sand: ['50', '100', '200', '300'],
  slate: ['100', '200', '300', '400', '500', '600', '700', '800'],
  ink: ['300', '400', '500', '700', '800', '900'],
  cloud: ['50', '100', '200'],
};

const FAMILY_LABELS: Record<string, string> = {
  petrol: 'Petróleo',
  terra: 'Terracota',
  ochre: 'Ocre',
  green: 'Verde',
  sand: 'Areia',
  slate: 'Ardósia',
  ink: 'Tinta',
  cloud: 'Nuvem',
};

const TOKEN_RE = /^var\(--([a-z]+)-(\d+)\)$/;

function parseToken(value: string) {
  const match = value.match(TOKEN_RE);
  if (!match || !TOKEN_COLORS[match[1]]?.includes(match[2])) return null;
  return { family: match[1], shade: match[2] };
}

function preferredShade(family: string, current?: string) {
  const shades = TOKEN_COLORS[family];
  if (current && shades.includes(current)) return current;
  return shades.includes('600') ? '600' : shades[Math.floor(shades.length / 2)];
}

export function TokenColorControl({ value, onChange, allowDefault = true }: {
  value: string;
  onChange: (value: string) => void;
  allowDefault?: boolean;
}) {
  const parsed = parseToken(value);
  const family = parsed?.family || '';
  const isLegacyValue = !!value && !parsed;

  return (
    <div className={styles.root}>
      <select
        className={`${styles.select} ${!family ? styles.full : ''}`}
        value={family || (isLegacyValue ? '__legacy' : '')}
        onChange={(event) => {
          const nextFamily = event.target.value;
          if (!nextFamily) return onChange('');
          if (nextFamily === '__legacy') return;
          onChange(`var(--${nextFamily}-${preferredShade(nextFamily, parsed?.shade)})`);
        }}
        aria-label="Família de cor"
      >
        {allowDefault && <option value="">Padrão</option>}
        {isLegacyValue && <option value="__legacy">Valor atual</option>}
        {Object.keys(TOKEN_COLORS).map((key) => (
          <option key={key} value={key}>{FAMILY_LABELS[key]}</option>
        ))}
      </select>
      {family && (
        <select
          className={styles.select}
          value={parsed?.shade || preferredShade(family)}
          onChange={(event) => onChange(`var(--${family}-${event.target.value})`)}
          aria-label="Intensidade da cor"
        >
          {TOKEN_COLORS[family].map((shade) => <option key={shade} value={shade}>{shade}</option>)}
        </select>
      )}
    </div>
  );
}
