export type Country = {
  name: string;
  code: string;
  phone: string;
  flag: string;
};

export const countries: Country[] = [
  { name: "India", code: "IN", phone: "+91", flag: "🇮🇳" },
  { name: "United Arab Emirates", code: "AE", phone: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "SA", phone: "+966", flag: "🇸🇦" },
  { name: "Qatar", code: "QA", phone: "+974", flag: "🇶🇦" },
  { name: "United States", code: "US", phone: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", phone: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "CA", phone: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", phone: "+61", flag: "🇦🇺" },
  { name: "Singapore", code: "SG", phone: "+65", flag: "🇸🇬" },
  { name: "Malaysia", code: "MY", phone: "+60", flag: "🇲🇾" },
  { name: 'Germany', code: 'DE', phone: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', phone: '+33', flag: '🇫🇷' },
  { name: 'Japan', code: 'JP', phone: '+81', flag: '🇯🇵' },
  { name: 'China', code: 'CN', phone: '+86', flag: '🇨🇳' },
  { name: 'Brazil', code: 'BR', phone: '+55', flag: '🇧🇷' },
  { name: 'South Africa', code: 'ZA', phone: '+27', flag: '🇿🇦' },
  { name: 'Nigeria', code: 'NG', phone: '+234', flag: '🇳🇬' },
  { name: 'Egypt', code: 'EG', phone: '+20', flag: '🇪🇬' },
  { name: 'Russia', code: 'RU', phone: '+7', flag: '🇷🇺' },
  { name: 'Pakistan', code: 'PK', phone: '+92', flag: '🇵🇰' },
  { name: 'Bangladesh', code: 'BD', phone: '+880', flag: '🇧🇩' },
  { name: 'Sri Lanka', code: 'LK', phone: '+94', flag: '🇱🇰' },
  { name: 'Nepal', code: 'NP', phone: '+977', flag: '🇳🇵' },
];
