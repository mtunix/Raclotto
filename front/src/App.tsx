import './App.css';
import {Outlet, useLocation} from "react-router";
import {Row, Col, Layout} from "antd";
import raclotto from "./raclotto-vibe.png"
import {useAppStore} from "./AppSlice";
import {XpNotification} from "./components/XpNotification";

const {Content} = Layout;

export function App() {
    const location = useLocation();
    const removeWidthCap = useAppStore((state) => state.removeWidthCap);
    // Only show logo on login/register/session selection pages, not on session pages (where Toolbar has it)
    const showLogo = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';

    return (
        <Layout style={{minHeight: '100vh', background: '#f5f5f7'}}>
            <Content className={`app-content ${removeWidthCap ? 'no-max-width' : ''}`}>
                {showLogo && (
                    <Row justify="center" style={{ marginTop: '60px', marginBottom: '48px' }}>
                        <Col span={24} style={{textAlign: 'center'}}>
                            <img width={200} src={raclotto} alt=""/>
                        </Col>
                    </Row>
                )}
                <Row justify="center">
                    <Col span={24}>
                        <Outlet/>
                    </Col>
                </Row>
                <XpNotification />
            </Content>
        </Layout>
    );
}

export default App