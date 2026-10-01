import { type ComponentType } from "react";
import type { InstanceState } from "../../domain";
import { toNumber } from "../../shared/lib/format";
import { RangeField, SelectField, TextField, ToggleField } from "../../shared/ui/Field";
import { CodePreview } from "./CodePreview";
import { coerceValue, type ParamDescriptor, type ParamKind } from "./paramSchema";

interface EditorProps {
  descriptor: ParamDescriptor;
  value: unknown;
  state?: InstanceState;
  onChange: (value: unknown) => void;
}

function ValueEditor({ descriptor, value, onChange }: EditorProps) {
  return (
    <TextField
      label={descriptor.label}
      hint={descriptor.unit}
      value={value === undefined || value === null ? "" : String(value)}
      onCommit={(raw) => onChange(coerceValue(raw, value))}
    />
  );
}

function RampEditor({ descriptor, value, onChange }: EditorProps) {
  return (
    <TextField
      label={descriptor.label}
      hint={descriptor.unit ? `${descriptor.unit} · optional` : "optional"}
      value={value === undefined || value === null ? "" : String(value)}
      onCommit={(raw) => onChange(raw.trim() === "" ? undefined : coerceValue(raw, undefined))}
    />
  );
}

function ColorEditor({ descriptor, value, onChange }: EditorProps) {
  return (
    <SelectField
      label={descriptor.label}
      value={String(value ?? "red")}
      options={descriptor.options ?? []}
      onChange={onChange}
    />
  );
}

function ToggleEditor({ descriptor, value, onChange }: EditorProps) {
  return (
    <ToggleField
      label={descriptor.label}
      checked={toNumber(value) === 1}
      onChange={(checked) => onChange(checked ? 1 : 0)}
    />
  );
}

function RangeEditor({ descriptor, value, onChange }: EditorProps) {
  return (
    <RangeField
      label={descriptor.label}
      value={toNumber(value, 0.5)}
      min={0}
      max={1}
      step={0.01}
      format={(v) => `${Math.round(v * 100)}%`}
      onChange={onChange}
    />
  );
}

function FirmwareParamEditor({ value, state }: EditorProps) {
  return <CodePreview value={String(value ?? "")} fault={state?.fault} />;
}

const EDITORS: Record<ParamKind, ComponentType<EditorProps>> = {
  value: ValueEditor,
  ramp: RampEditor,
  color: ColorEditor,
  toggle: ToggleEditor,
  range: RangeEditor,
  firmware: FirmwareParamEditor,
};

export function ParamEditor(props: EditorProps) {
  const Editor = EDITORS[props.descriptor.kind];
  return <Editor {...props} />;
}
