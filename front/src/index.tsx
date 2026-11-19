import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { followUserLanguage } from './i18n';
import {RouterProvider} from "react-router/dom";
import {RaclottoRouter} from "./Router";

followUserLanguage();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={RaclottoRouter}/>
  </StrictMode>
);
