export function RepresentativeSprite() {
  return (
    <svg
      className="representative-sprite"
      viewBox="0 0 120 210"
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="外勤人物，分層步態角色"
    >
      <g className="sprite-leg sprite-leg-left">
        <path d="M45 125L45 160H58L62 126Z" fill="#2b4550" />
        <g className="sprite-calf">
          <path d="M45 156L45 195H57L58 156Z" fill="#263e49" />
          <path d="M43 193H59V203H40Q38 197 43 193Z" fill="#192f35" />
        </g>
      </g>
      <g className="sprite-leg sprite-leg-right">
        <path d="M63 125L67 160H79L77 125Z" fill="#28424c" />
        <g className="sprite-calf">
          <path d="M67 156L67 195H80L79 156Z" fill="#233a45" />
          <path d="M66 193H82L85 203H64Q62 197 66 193Z" fill="#192f35" />
        </g>
      </g>
      <g className="sprite-upper-body">
        <g className="sprite-arm sprite-arm-left">
          <path d="M37 67Q26 71 24 85L18 120 28 124 42 87Z" fill="#5d867d" />
          <path d="M18 118L28 122 25 134Q20 141 16 132Z" fill="#d1ab8b" />
        </g>
        <path d="M36 65Q60 53 84 65L87 129Q61 143 32 130Z" fill="#4c7771" />
        <path d="M47 64L60 85 73 64" fill="#edf1e5" />
        <path d="M58 80L55 112 61 119 66 111 62 81Z" fill="#b0c591" />
        <g className="sprite-arm sprite-arm-right">
          <path d="M82 68Q92 71 94 86L101 116 92 120 78 87Z" fill="#41655f" />
          <path d="M92 114L101 113 105 127Q102 135 96 130Z" fill="#d1ab8b" />
          <g className="sprite-bag">
            <rect x="88" y="126" width="29" height="28" rx="4" fill="#675f4d" />
            <path d="M96 126V120H108V126" fill="none" stroke="#675f4d" strokeWidth="3" />
            <path d="M93 130H111" stroke="#867d64" />
          </g>
        </g>
        <path d="M52 51V64Q60 77 70 64V51Z" fill="#cda687" />
        <g className="sprite-head">
          <ellipse cx="60" cy="34" rx="22" ry="26" fill="#ddb99a" />
          <path d="M37 30Q33 1 59 4Q88 3 84 34L76 22 60 19 43 26 42 37Z" fill="#263e3f" />
          <path d="M40 30Q33 28 35 38T42 45M80 30Q87 28 85 38T78 45" fill="#d7b292" />
          <path d="M47 34H55M65 34H73" stroke="#3e4f48" strokeWidth="2" />
          <circle cx="51" cy="36" r="1.4" fill="#334d48" />
          <circle cx="69" cy="36" r="1.4" fill="#334d48" />
          <path d="M55 47Q61 51 67 46" stroke="#a0765b" strokeWidth="1.5" fill="none" />
        </g>
        <path d="M73 82V99" stroke="#a5c0ac" />
        <rect x="69" y="88" width="13" height="17" rx="2" fill="#e4ebdc" />
        <rect x="72" y="91" width="7" height="4" fill="#88a68a" />
      </g>
    </svg>
  );
}
