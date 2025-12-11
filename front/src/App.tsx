import './App.css';
import {Outlet} from "react-router";
import {Row, Col, Layout} from "antd";
import raclotto from "./raclotto-vibe.png"

const {Content} = Layout;

export function App() {
    return (
        <Layout style={{minHeight: '100vh'}}>
            <Content style={{padding: '20px'}}>
                <Row justify="center">
                    <Col span={24} style={{textAlign: 'center'}}>
                        <img width={180} src={raclotto} alt=""/>
                    </Col>
                </Row>
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