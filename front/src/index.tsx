import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import './index.css';
import { followUserLanguage } from './i18n';
import {RouterProvider} from "react-router/dom";
import {RaclottoRouter} from "./Router";
import { AntdLocale } from './AntdLocale';
import { AppTheme, ThemeProvider } from './AppTheme';

followUserLanguage();
// message and the other static methods render outside the tree, so they get the theme and locale here.
ConfigProvider.config({
  holderRender: (children) => (
    <ThemeProvider>
      <AntdLocale>{children}</AntdLocale>
    </ThemeProvider>
  ),
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppTheme>
      <AntdLocale>
        <RouterProvider router={RaclottoRouter}/>
      </AntdLocale>
    </AppTheme>
  </StrictMode>
);
