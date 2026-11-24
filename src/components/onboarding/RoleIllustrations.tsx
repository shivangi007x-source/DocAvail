import React from 'react';

export function PatientIllustration({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft radial backdrop */}
      <ellipse cx="160" cy="100" rx="126" ry="74" fill="#F0FDFA" />
      <circle cx="92" cy="56" r="26" fill="#CCFBF1" opacity="0.85" />
      <circle cx="242" cy="132" r="22" fill="#D1FAE5" opacity="0.8" />

      {/* Ground shadow */}
      <ellipse cx="152" cy="166" rx="84" ry="8" fill="#CBD5E1" opacity="0.45" />

      {/* Healthcare discovery card (left background) */}
      <rect x="44" y="54" width="84" height="62" rx="12" fill="#FFFFFF" stroke="#CCFBF1" strokeWidth="2" />
      <circle cx="64" cy="74" r="10" fill="#CCFBF1" />
      <path
        d="M64 68.5C61.5 68.5 59.5 70.5 59.5 73C59.5 76.4 64 80 64 80C64 80 68.5 76.4 68.5 73C68.5 70.5 66.5 68.5 64 68.5Z"
        fill="#0D9488"
      />
      <circle cx="64" cy="73" r="2" fill="#FFFFFF" />
      <rect x="81" y="69" width="35" height="5" rx="2.5" fill="#0F766E" opacity="0.85" />
      <rect x="81" y="78" width="26" height="4" rx="2" fill="#94A3B8" opacity="0.55" />
      <rect x="54" y="94" width="64" height="12" rx="6" fill="#ECFDF5" />
      <circle cx="64" cy="100" r="3" fill="#059669" />
      <rect x="71" y="98" width="38" height="4" rx="2" fill="#059669" opacity="0.7" />

      {/* Patient character */}
      {/* Shoulders & casual top */}
      <path
        d="M118 164C118 139.699 137.699 120 162 120H168C192.301 120 212 139.699 212 164H118Z"
        fill="#0D9488"
      />
      <path d="M148 121C154 128 176 128 182 121L176 135H154L148 121Z" fill="#14B8A6" />

      {/* Neck & Head */}
      <rect x="157" y="103" width="16" height="20" rx="8" fill="#F4C7A1" />
      {/* Hair back */}
      <path
        d="M137 78C137 59.775 151.775 45 170 45C184.5 45 196 56.5 196 71V96C196 101 192 104 188 104H142C139 104 137 99 137 94V78Z"
        fill="#1E293B"
      />
      {/* Face */}
      <circle cx="165" cy="82" r="24" fill="#F7D3B5" />
      {/* Hair front sweep */}
      <path
        d="M141 78C143 62 155 55 168 55C180 55 188 63 189 74C181 67 167 66 154 71C148 73 144 76 141 78Z"
        fill="#1E293B"
      />
      {/* Warm expression */}
      <circle cx="157" cy="83" r="2.3" fill="#1E293B" />
      <circle cx="173" cy="83" r="2.3" fill="#1E293B" />
      <path d="M158 92C162 96 168 96 172 92" stroke="#9A5B3C" strokeWidth="2.4" strokeLinecap="round" />

      {/* Heart / Care verified badge (right foreground) */}
      <rect x="206" y="46" width="74" height="54" rx="14" fill="#FFFFFF" stroke="#99F6E4" strokeWidth="2" />
      <circle cx="243" cy="66" r="12" fill="#ECFDF5" />
      <path
        d="M243 73C243 73 235.5 68.3 235.5 63.4C235.5 61.1 237.3 59.3 239.5 59.3C241.1 59.3 242.4 60.2 243 61.5C243.6 60.2 244.9 59.3 246.5 59.3C248.7 59.3 250.5 61.1 250.5 63.4C250.5 68.3 243 73 243 73Z"
        fill="#059669"
      />
      <rect x="222" y="84" width="42" height="5" rx="2.5" fill="#0F172A" opacity="0.8" />
    </svg>
  );
}

export function DoctorIllustration({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft radial backdrop */}
      <ellipse cx="160" cy="100" rx="126" ry="74" fill="#F0FDFA" />
      <circle cx="80" cy="126" r="24" fill="#CCFBF1" opacity="0.8" />
      <circle cx="236" cy="54" r="24" fill="#E0F2FE" opacity="0.9" />

      {/* Ground shadow */}
      <ellipse cx="158" cy="166" rx="84" ry="8" fill="#CBD5E1" opacity="0.45" />

      {/* Clinician verification badge (left) */}
      <rect x="40" y="50" width="76" height="60" rx="14" fill="#FFFFFF" stroke="#99F6E4" strokeWidth="2" />
      <circle cx="78" cy="70" r="12" fill="#0D9488" />
      <path d="M78 64V76M72 70H84" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
      <rect x="54" y="89" width="48" height="5" rx="2.5" fill="#0F172A" opacity="0.8" />
      <rect x="61" y="98" width="34" height="4" rx="2" fill="#0D9488" opacity="0.55" />

      {/* Healthcare professional figure */}
      {/* Inner teal scrubs */}
      <path
        d="M116 164C116 138.595 136.595 118 162 118H166C191.405 118 212 138.595 212 164H116Z"
        fill="#0F766E"
      />
      {/* White medical coat lapels */}
      <path d="M116 164C116 141 133 122 154 119L161 164H116Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
      <path d="M212 164C212 141 195 122 174 119L167 164H212Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
      {/* Pocket badge on coat */}
      <rect x="180" y="142" width="16" height="10" rx="3" fill="#CCFBF1" />
      <path d="M188 144.5V149.5M185.5 147H190.5" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" />

      {/* Neck & Head */}
      <rect x="156" y="101" width="16" height="20" rx="8" fill="#F2C39B" />
      <circle cx="164" cy="80" r="24" fill="#F6D0AF" />
      {/* Hair */}
      <path
        d="M140 76C140 61 151 51 165 51C179 51 188 61 188 76C182 69 175 66 164 66C153 66 146 69 140 76Z"
        fill="#0F172A"
      />
      {/* Glasses */}
      <rect x="148" y="75" width="13" height="9" rx="3.5" stroke="#334155" strokeWidth="2" fill="#FFFFFF" fillOpacity="0.25" />
      <rect x="167" y="75" width="13" height="9" rx="3.5" stroke="#334155" strokeWidth="2" fill="#FFFFFF" fillOpacity="0.25" />
      <path d="M161 79H167" stroke="#334155" strokeWidth="2" />
      <circle cx="154.5" cy="79.5" r="1.8" fill="#0F172A" />
      <circle cx="173.5" cy="79.5" r="1.8" fill="#0F172A" />
      <path d="M158 91C162 94.5 166 94.5 170 91" stroke="#9A5B3C" strokeWidth="2.3" strokeLinecap="round" />

      {/* Stethoscope around shoulders */}
      <path
        d="M146 121C144 134 150 144 164 144C178 144 184 134 182 121"
        stroke="#1E293B"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M164 144V155" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="164" cy="157" r="5" fill="#14B8A6" stroke="#1E293B" strokeWidth="2" />

      {/* Patient connection card (right) */}
      <rect x="208" y="64" width="76" height="58" rx="14" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="2" />
      <rect x="220" y="77" width="22" height="22" rx="11" fill="#E0F2FE" />
      <path d="M227 88L230 91L236 85" stroke="#0284C7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="248" y="81" width="26" height="5" rx="2.5" fill="#0F172A" opacity="0.8" />
      <rect x="248" y="90" width="20" height="4" rx="2" fill="#0284C7" opacity="0.65" />
      <rect x="220" y="106" width="52" height="6" rx="3" fill="#F0FDFA" />
    </svg>
  );
}

export function AdministratorIllustration({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft radial backdrop */}
      <ellipse cx="160" cy="100" rx="126" ry="74" fill="#F8FAFC" />
      <circle cx="88" cy="58" r="24" fill="#FEF3C7" opacity="0.9" />
      <circle cx="236" cy="128" r="26" fill="#CCFBF1" opacity="0.85" />

      {/* Ground shadow */}
      <ellipse cx="160" cy="166" rx="88" ry="8" fill="#CBD5E1" opacity="0.5" />

      {/* Governance Console Frame */}
      <rect x="64" y="44" width="192" height="114" rx="16" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
      {/* Top dark slate bar */}
      <path
        d="M64 60C64 51.163 71.163 44 80 44H240C248.837 44 256 51.163 256 60V68H64V60Z"
        fill="#0F172A"
      />
      <circle cx="82" cy="56" r="3.5" fill="#14B8A6" />
      <circle cx="94" cy="56" r="3.5" fill="#F59E0B" />
      <circle cx="106" cy="56" r="3.5" fill="#64748B" />
      <rect x="198" y="52" width="44" height="8" rx="4" fill="#1E293B" />

      {/* Left Column: Approval Checklist Rows */}
      <rect x="80" y="80" width="96" height="20" rx="7" fill="#F0FDFA" stroke="#99F6E4" strokeWidth="1.2" />
      <circle cx="93" cy="90" r="5" fill="#059669" />
      <path d="M90.8 90L92.4 91.6L95.5 88.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="104" y="87" width="48" height="5" rx="2.5" fill="#0F172A" opacity="0.8" />

      <rect x="80" y="106" width="96" height="20" rx="7" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1.2" />
      <circle cx="93" cy="116" r="5" fill="#D97706" />
      <rect x="91.5" y="114.5" width="3" height="3" rx="1.5" fill="#FFFFFF" />
      <rect x="104" y="113" width="56" height="5" rx="2.5" fill="#0F172A" opacity="0.8" />

      <rect x="80" y="132" width="96" height="16" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.2" />
      <rect x="90" y="138" width="42" height="4" rx="2" fill="#94A3B8" opacity="0.7" />

      {/* Right Column: Security Shield Card */}
      <rect x="188" y="80" width="54" height="68" rx="12" fill="#F0FDFA" stroke="#99F6E4" strokeWidth="1.5" />
      <path
        d="M215 92L231 98V110C231 120.5 224.2 129.8 215 133C205.8 129.8 199 120.5 199 110V98L215 92Z"
        fill="#0D9488"
      />
      {/* Shield keyhole / lock */}
      <rect x="209.5" y="109.5" width="11" height="9" rx="2.5" fill="#FFFFFF" />
      <path
        d="M212 109.5V106.5C212 104.8 213.3 103.5 215 103.5C216.7 103.5 218 104.8 218 106.5V109.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
