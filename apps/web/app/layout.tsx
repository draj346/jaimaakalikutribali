import './styles.css';import type {Metadata} from 'next';
export const metadata:Metadata={title:'जय माँ काली कुटरी वाली | मंदिर सेवा पोर्टल',description:'मंदिर दर्शन, इतिहास, समिति एवं पारदर्शी सेवा प्रबंधन'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="hi"><body>{children}</body></html>}
