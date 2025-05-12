import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback } from 'react';

import { UiSwitch } from './UiSwitch';

export default function UiThemeSwitcher() {
  const { theme, setTheme, systemTheme } = useTheme();

  const currentTheme = theme === 'system' ? systemTheme : theme;

  const toggleTheme = useCallback(() => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, [currentTheme, setTheme]);

  return (
    <div className='flex w-full items-center justify-between gap-2'>
      <SunIcon className='size-4' />
      <UiSwitch
        checked={currentTheme === 'dark'}
        onCheckedChange={() => toggleTheme()}
      />
      <MoonIcon className='size-4' />
    </div>
  );
}
