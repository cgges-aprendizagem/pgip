// Tipos do contrato Builder ↔ SPU ENAP Design System

export type BlockKind = 'container' | 'text' | 'list' | 'marker';

export type FieldType =
  | 'text' | 'rich' | 'number' | 'bool' | 'icon'
  | 'select' | 'accent' | 'list' | 'object' | 'slot';

export interface FieldDef {
  key: string;            // '' = o próprio item é escalar
  label: string;
  type: FieldType;
  inline?: boolean;
  options?: { value: string; label: string }[];
  exclusive?: boolean;    // type 'bool': só um item da lista pode ser true (rádio)
  itemFields?: FieldDef[]; // type 'list': schema do sub-item
  fields?: FieldDef[];     // type 'object': schema do objeto
}

export interface BlockDef {
  type: string;
  component: string | null;
  label: string;
  cat: string;
  icon: string;
  kind: BlockKind;
  fields?: string[];
  rich?: boolean;
  props: Record<string, unknown>;
  itemsKey?: string;
  itemFields?: FieldDef[];
  propFields?: FieldDef[];
  locks?: { bg?: boolean };
  stack?: boolean;
  internal?: boolean;
  allowedTypes?: string[];
}

export interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: Block[];
}

export interface TocItem { id: string; text: string; hidden?: boolean }

export interface DocMeta {
  title: string;
  lang: string;
  builderCredit?: boolean;
  toc?: { enabled?: boolean; title?: string; items?: TocItem[] };
}

export interface Doc {
  schema: number;
  meta: DocMeta;
  blocks: Block[];
}

// accents e fontRoles são objetos; o resto são arrays de string (chaves de token).
export interface AccentOption {
  key: string;
  label: string;
  value: string;
  strong: string;
  soft: string;
}

export interface FontRole {
  key: string;
  label: string;
  var: string;
}

export interface BuilderManifestType {
  tones: string[];        // ['info','attention','warning','success','note','neutral']
  accents: AccentOption[];
  highlights: string[];   // ['ochre','terra','petrol','green','sand']
  textColors: string[];   // ['petrol','terra','ochre','green','muted']
  fontRoles: FontRole[];
  widths: string[];       // ['narrow','content','wide','full']
  surfaces: string[];     // ['none','page','white','warm','dark','terra-dark']
  spacing: string[];
  icons: string[];
}

export interface BlockRegistryType {
  blocks: BlockDef[];
  byType: Record<string, BlockDef>;
  cats: string[];
  structuralTypes: string[];
  childTypes: string[];
  newBlock: (type: string, child?: boolean) => Block;
}

export interface BuilderExportType {
  SCHEMA_VERSION: number;
  newDoc: (meta?: Partial<DocMeta>) => Doc;
  serialize: (doc: Doc) => string;
  migrate: (raw: unknown) => Doc;
  sanitize: (doc: Doc) => Doc;
  stats: (doc: Doc) => Record<string, number>;
  exportHTML: (
    doc: Doc,
    kit: { bundleHref?: string; stylesHref?: string; bundleJs?: string; stylesCss?: string },
    filename?: string
  ) => void;
  saveProject: (doc: Doc, filename?: string) => void;
  download: (content: string, filename: string, mime: string) => void;
}

export interface NS {
  BlockDocument: React.ComponentType<{ doc: Doc; mode?: 'preview' | 'edit'; showBuilderCredit?: boolean }>;
  BlockView: React.ComponentType<{ block: Block; mode?: 'preview' | 'edit'; onEdit?: (block: Block, patch: Record<string, unknown>) => void }>;
  BlockRegistry: BlockRegistryType;
  BuilderManifest: BuilderManifestType;
  BuilderExport: BuilderExportType;
  Editable: React.ComponentType<{ html: string; onChange: (html: string) => void; single?: boolean; placeholder?: string; as?: React.ElementType }>;
  RichText: React.ComponentType<{ html: string; as?: React.ElementType; className?: string }>;
  MarkToolbar: React.ComponentType<Record<string, never>>;
  IconGallery: React.ComponentType<{ value?: string; onPick: (name: string) => void; filter?: string; itemMin?: number; size?: number }>;
  Icon: React.ComponentType<{ name: string; size?: number }>;
  ICONS: Record<string, string>;
  ICON_NAMES: string[];
  ICON_SEARCH?: Record<string, string[]>;
  SPU_MARKS: unknown;
  // Componentes do DS acessíveis por nome (Section, Hero, Callout, …)
  Section: React.ComponentType<Record<string, unknown>>;
  [key: string]: unknown;
}

declare global {
  interface Window {
    SPUENAPAprendizagemDesignSystem_f0eeed: NS;
    __SPU_IMAGE_SLOT_RUNTIME?: {
      snapshot: () => string;
      replace: (content: string) => void;
      clear: () => void;
    };
  }
}
