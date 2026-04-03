import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export function Section(props: {
  kicker: string;
  title: string;
  description: string;
  tag?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn('section', props.disabled && 'is-disabled')}>
      <div className="section__header">
        <div>
          <div className="section__kicker">{props.kicker}</div>
          <h2 className="section__title">{props.title}</h2>
          <p className="section__description">{props.description}</p>
        </div>
        {props.tag ? <div className="section__tag">{props.tag}</div> : null}
      </div>
      <div className="section__body">{props.children}</div>
    </section>
  );
}

export function Field(props: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{props.label}</span>
      {props.children}
      {props.hint ? <span className="field__hint">{props.hint}</span> : null}
    </label>
  );
}

export function InputShell(props: {
  children: ReactNode;
  readOnly?: boolean;
  select?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'input-shell',
        props.readOnly && 'input-shell--readonly',
        props.select && 'input-shell--select',
        props.compact && 'input-shell--compact',
      )}
    >
      {props.children}
    </div>
  );
}

export function ToggleCard(props: {
  title: string;
  description: string;
  checked: boolean;
  compact?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={cn('toggle-card', props.compact && 'toggle-card--compact')}>
      <div>
        <div className="toggle-card__title">{props.title}</div>
        <div className="toggle-card__description">{props.description}</div>
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(event) => props.onChange(event.target.checked)}
        />
        <span className="toggle__track" />
        <span className="toggle__thumb" />
      </label>
    </div>
  );
}

export function SecretField(props: {
  label: string;
  value: string;
  placeholder: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (props.disabled) {
      setVisible(false);
    }
  }, [props.disabled]);

  return (
    <Field label={props.label} hint={props.hint}>
      <InputShell compact={props.compact}>
        <input
          type={visible ? 'text' : 'password'}
          value={props.value}
          placeholder={props.placeholder}
          disabled={props.disabled}
          onChange={(event) => props.onChange(event.target.value)}
        />
        <button
          className="input-action"
          type="button"
          disabled={props.disabled}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? '隐藏' : '显示'}
        </button>
      </InputShell>
    </Field>
  );
}
