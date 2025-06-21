import { Button } from '@/components/ui/button';
import useI18n from '@/hooks/use-i18n';

export default function LanguageSwitcher() {
  const { getCurrentLanguage, changeLanguage } = useI18n();
  const currentLang = getCurrentLanguage();
  
  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'vi' : 'en';
    changeLanguage(newLang);
  };

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className="bg-background/80 backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200 min-w-[60px] font-medium"
    >
      <span className="text-sm font-semibold">
        {currentLang === 'en' ? 'EN' : 'VI'}
      </span>
      <span className="mx-1 text-white/60">|</span>
      <span className="text-xs text-white/80">
        {currentLang === 'en' ? 'VI' : 'EN'}
      </span>
    </Button>
  );
}