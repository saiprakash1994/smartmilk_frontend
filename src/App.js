import logo from './logo.svg';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap-icons/font/bootstrap-icons.css";

import AppRoutes from './routes/routes';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import store from './store/store';

function App() {
  return (
    <>
      <Provider store={store}>

        <AppRoutes />
        <Toaster></Toaster>
      </Provider>
    </>
  );
}

export default App;
