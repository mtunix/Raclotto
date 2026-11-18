import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import reportWebVitals from './reportWebVitals';
import {RouterProvider} from "react-router";
import {RaclottoRouter} from "./Router";

const startApp = () => {
  const container = document.getElementById('root');
  if (!container) {
    // If it fails, wait 10ms and try once more (sometimes HMR/hydration is weird)
    setTimeout(startApp, 10);
    return;
  }
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <RouterProvider router={RaclottoRouter}/>
    </React.StrictMode>
  );
};

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
startApp();