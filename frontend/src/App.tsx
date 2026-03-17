import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import PersonaPage from './pages/PersonaPage';
import './App.css';

function App() {
  return (
    <Routes>
      {/* 주소가 '/' (메인) 일때 MainPage 컴포넌트를 보여줌 */}
      <Route path="/" element={<MainPage />} />
      {/* 주소가 '/login' 일때 LoginPage 컴포넌트를 보여줌 */}
      <Route path="/login" element={<LoginPage />} />
      {/* 주소가 '/persona/:followName' 일때 PersonaPage 컴포넌트를 보여줌 */}
      <Route path="/persona/:followName" element={<PersonaPage />} />
      {/* 없는 주소로 들어갔을 때 표시할 페이지 처리도 나중에 추가할 수 있음 */}
    </Routes>
  );
}

export default App;
