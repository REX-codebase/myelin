import { useImperativeHandle, useRef } from 'react';
import type { JSX, Ref } from 'react';

export interface TextInputHandle {
  focus: () => void;
  clear: () => void;
}

interface TextInputProps {
  label: string;
  placeholder?: string;
  ref?: Ref<TextInputHandle>;
}

export function TextInput({ label, placeholder = 'Type here', ref }: TextInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      if (inputRef.current) inputRef.current.value = '';
    },
  }));

  return (
    <label className="field">
      <span>{label}</span>
      <input ref={inputRef} placeholder={placeholder} />
    </label>
  );
}
