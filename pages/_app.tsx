import '../styles/global.scss';

interface AppProps {
  Component: React.ComponentType;
  pageProps: any;
}
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
