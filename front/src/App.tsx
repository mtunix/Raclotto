import './App.css';
import {Outlet, useLocation} from "react-router";
import {Row, Col, Layout} from "antd";
import raclotto from "./raclotto-vibe.png"

const {Content} = Layout;

export function App() {
    const location = useLocation();
    // Only show logo on login/register pages, not on session pages (where Toolbar has it)
    const showLogo = location.pathname === '/login' || location.pathname === '/register';

    return (
        <Layout style={{minHeight: '100vh'}}>
            <Content className="app-content">
                {showLogo && (
                    <Row justify="center">
                        <Col span={24} style={{textAlign: 'center'}}>
                            <img width={180} src={raclotto} alt=""/>
                        </Col>
                    </Row>
                )}
                <Row justify="center">
                    <Col span={24}>
                        <Outlet/>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}

export default App