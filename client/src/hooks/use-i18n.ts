import { useTranslation } from 'react-i18next';

export const useI18n = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const getCurrentLanguage = () => {
    return i18n.language;
  };

  const isRTL = () => {
    return i18n.dir() === 'rtl';
  };

  // Helper functions for common translation patterns
  const tc = (key: string, options?: any) => t(`common.${key}`, options);
  const tf = (key: string, options?: any) => t(`forms.${key}`, options);
  const tn = (key: string, options?: any) => t(`navigation.${key}`, options);
  const tb = (key: string, options?: any) => t(`buttons.${key}`, options);
  const tp = (key: string, options?: any) => t(`pages.${key}`, options);
  const ta = (key: string, options?: any) => t(`auth.${key}`, options);
  const tadmin = (key: string, options?: any) => t(`admin.${key}`, options);

  return {
    t,
    tc,
    tf,
    tn,
    tb,
    tp,
    ta,
    tadmin,
    changeLanguage,
    getCurrentLanguage,
    isRTL,
    i18n
  };
};

export default useI18n;