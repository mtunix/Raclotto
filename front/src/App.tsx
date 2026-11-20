import './App.css';
import {Outlet, useLocation} from "react-router";
import {Row, Col, Layout} from "antd";
import raclotto from "./raclotto-vibe.png"
import {useAppStore} from "./AppSlice";
import {XpNotification} from "./shared/XpNotification/XpNotification";

const {Content} = Layout;

export function App() {
    const location = useLocation();
    const removeWidthCap = useAppStore((state) => state.removeWidthCap);
    // Only show logo on login/register/session selection pages, not on session pages (where Toolbar has it)
    const showLogo = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';

    return (
        <Layout className="app-layout">
            <Content className={`app-content ${removeWidthCap ? 'no-max-width' : ''}`}>
                {showLogo && (
                    <Row justify="center" className="app-logo">
                        <Col span={24} className="text-center">
                            <img width={200} src={raclotto} alt="" className="brand-logo"/>
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