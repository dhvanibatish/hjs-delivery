import { useEffect } from 'react';
import css from './styles.css?inline';
import App from './App.tsx';
import { ToastProvider } from './ui.tsx';

/* HJS Recovery — opens at /?recovery (same app + hosting as delivery).
   Its CSS is added only while this page is open, and body.rec-on resets
   the delivery app's global #root / heading styles for this page. */
export default function Recovery() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    document.body.classList.add('rec-on');
    document.title = 'HJS Recovery';
    return () => { style.remove(); document.body.classList.remove('rec-on'); };
  }, []);
  return <div className="rec-app"><ToastProvider><App /></ToastProvider></div>;
}
