import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

/* React forms of the shell pieces transcribed from apps/landing/src/styles/landing.css
   and apps/registry/public/hub.css. Styling lives in styles.css (cp-* classes). */

export type Arrow = 'in' | 'out' | 'up' | 'down' | 'none';
const ARROW: Record<Arrow, string> = { in: '↙', out: '↗', up: '↑', down: '↓', none: '' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline';
  /** A trailing glyph, hidden from assistive tech. */
  glyph?: string;
}
/** Square action; its fill becomes the spectrum on hover, focus and press. */
export function Button({ variant = 'solid', glyph, className, children, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={['cp-button', variant === 'outline' && 'cp-button--outline', className].filter(Boolean).join(' ')} {...rest}>
    {children}{glyph && <span aria-hidden="true">{glyph}</span>}
  </button>;
}

export interface TextLinkProps { href: string; children: ReactNode; arrow?: Arrow }
/** Bold link with a large trailing arrow: ↗ elsewhere, ↙ in-page, ↑ back to top. */
export function TextLink({ href, children, arrow = 'out' }: TextLinkProps) {
  return <a className="cp-text-link" href={href}>{children}{arrow !== 'none' && <span aria-hidden="true">{ARROW[arrow]}</span>}</a>;
}

export interface MastheadProps {
  home?: string;
  links: { href: string; label: string; short?: string; arrow?: Arrow }[];
}
/** Type-only wordmark plus main navigation over a 2px ink rule. */
export function Masthead({ home = '/', links }: MastheadProps) {
  return <header className="cp-masthead">
    <a className="cp-wordmark" href={home} aria-label="Mazze LeCzzare Research home">MAZZE LECZZARE<span>RESEARCH</span></a>
    <nav className="cp-nav" aria-label="Main">
      {links.map(l => <a key={l.href} href={l.href} aria-label={l.short ? l.label : undefined}>
        <span className="cp-nav-wide">{l.label}</span>{l.short && <span className="cp-nav-compact" aria-hidden="true">{l.short}</span>}
        <span aria-hidden="true">{ARROW[l.arrow ?? (l.href.startsWith('#') ? 'in' : 'out')]}</span>
      </a>)}
    </nav>
  </header>;
}

export type Capability = 'Discovery' | 'Source-inspected' | 'Implemented' | 'Locally tested' | 'Production-verified' | (string & {});

export interface StudyRowProps {
  number: string;
  name: string;
  method: string;
  description: string;
  /** The exact capability state, in words. */
  capability: Capability;
  href: string;
  entry?: string;
  active?: boolean;
  onPreview?: () => void;
}
/** One study in the index. Hover and focus are reported through onPreview; `active` marks the pinned one. */
export function StudyRow({ number, name, method, description, capability, href, entry = 'Enter', active = false, onPreview }: StudyRowProps) {
  return <article className="cp-study-row" data-active={active} onPointerEnter={onPreview} onFocus={onPreview}>
    <span className="cp-record cp-study-number">{number}</span>
    <div className="cp-study-name"><span className="cp-record">{method}</span><h3>{name}</h3></div>
    <div className="cp-study-description"><p>{description}</p><span className="cp-record cp-capability">{capability}</span></div>
    <a className="cp-study-enter" href={href} aria-label={`${entry}: ${name}`}>{entry} <span aria-hidden="true">↗</span></a>
  </article>;
}

export interface ReleaseCardProps { date: string; version?: string; title: string; href: string; hash: string; citation?: string }
/** A reviewed public release. A hash identifies bytes; it does not certify a claim. */
export function ReleaseCard({ date, version, title, href, hash, citation }: ReleaseCardProps) {
  return <article className="cp-release">
    <p className="cp-record">{[date, version].filter(Boolean).join(' · ')}</p>
    <h3><a href={href}>{title}</a></h3>
    <p className="cp-hash">sha256 {hash}</p>
    {citation && <p className="cp-citation">{citation}</p>}
  </article>;
}

type FieldBase = { id: string; label: string; hint?: string };
export type FieldProps = FieldBase & (({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>) | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>));
/** Labelled input or textarea for the private hub. */
export function Field(props: FieldProps) {
  const { id, label, hint, multiline, ...rest } = props as FieldBase & { multiline?: boolean } & Record<string, unknown>;
  return <div className="cp-field">
    <label className="cp-label" htmlFor={id}>{label}</label>
    {multiline ? <textarea id={id} className="cp-input" {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      : <input id={id} className="cp-input" {...(rest as InputHTMLAttributes<HTMLInputElement>)} />}
    {hint && <p className="cp-hint">{hint}</p>}
  </div>;
}

export interface NoticeProps { tone?: 'notice' | 'error'; label?: string; children: ReactNode }
/** Status message; severity is rule weight (1px notice, 3px error), never color. */
export function Notice({ tone = 'notice', label, children }: NoticeProps) {
  return <div className={`cp-notice${tone === 'error' ? ' cp-notice--error' : ''}`} role={tone === 'error' ? 'alert' : 'status'}>
    {label && <strong>{label}</strong>}{children}
  </div>;
}
