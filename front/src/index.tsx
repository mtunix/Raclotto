import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import './index.css';
import { followUserLanguage } from './i18n';
import {RouterProvider} from "react-router/dom";
import {RaclottoRouter} from "./Router";
import { AntdLocale } from './AntdLocale';

followUserLanguage();
// message and the other static methods render outside the tree, so they get the locale here.
ConfigProvider.config({ holderRender: (children) => <AntdLocale>{children}</AntdLocale> });
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AntdLocale>
      <RouterProvider router={RaclottoRouter}/>
    </AntdLocale>
  </StrictMode>
);
