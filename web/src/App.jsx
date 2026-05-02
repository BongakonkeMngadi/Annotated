import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Feed from './pages/Feed.jsx';
import AnnotationDetail from './pages/AnnotationDetail.jsx';
import CreateAnnotation from './pages/CreateAnnotation.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/create" element={<CreateAnnotation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/annotation/:id" element={<AnnotationDetail />} />
        <Route path="/u/:id" element={<Profile />} />
      </Route>
    </Routes>
  );
}
