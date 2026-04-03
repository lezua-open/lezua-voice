import { BAR_WEIGHTS } from '../constants';

type Props = {
  viewState: string;
  visible: boolean;
  capsuleWidth: number;
  waveHeights: number[];
  displayBadge: string;
  displayHint: string;
  displaySubtle: boolean;
  text: string;
  measurerRef: React.RefObject<HTMLSpanElement>;
};

export function CapsuleView(props: Props) {
  return (
    <div className="capsule-shell">
      <div
        className={`capsule state-${props.viewState} ${props.visible ? 'is-visible' : ''}`}
        style={{ width: `${props.capsuleWidth}px` }}
      >
        <div className="capsule__ambient" aria-hidden="true" />
        <div className={`capsule__visual-shell state-${props.viewState}`} aria-hidden="true">
          <div className="capsule__visual">
            {props.waveHeights.map((height, index) => (
              <div
                key={`${BAR_WEIGHTS[index]}-${index}`}
                className="capsule__wave-bar"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        </div>

        <div className="capsule__content">
          <div className="capsule__meta">
            <div className={`capsule__badge state-${props.viewState}`}>
              <span className="capsule__badge-dot" />
              <span>{props.displayBadge}</span>
            </div>
            <div className="capsule__hint">{props.displayHint}</div>
          </div>
          <div className={`capsule__transcript ${props.displaySubtle ? 'is-subtle' : ''}`}>
            {props.text}
          </div>
        </div>
      </div>
      <span className="capsule__measurer" ref={props.measurerRef} />
    </div>
  );
}
