 import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Orders } from './pages/Orders';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Contact } from './pages/Contact';
import { About } from './pages/About';
import { Home } from './pages/Home';
import AddBlog from './pages/Blog/AddBlog';
import AddProduct from './pages/products/AddProduct';
import AddService from './pages/services/AddService';
import AddCourse from './pages/Courses/AddCourse';
import Service from './pages/services/service';
import EditService from './pages/services/EditService';
import EditProduct from './pages/products/EditProduct';
import Products from './pages/products/Products';
import Blog from "./pages/Blog/Blog";
import EditBlog from "./pages/Blog/EditBlog";
import Courses from './pages/Courses/Courses';
import EditCourse from './pages/Courses/EditCourse';
import { ServiceRequests } from './pages/ServiceRequests';
import TechnicalOfferPage from './pages/TechnicalOfferPage';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/about" element={<About />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/home" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/addblog" element={<AddBlog/>} />
        <Route path="/editblog/:id" element={<EditBlog />} />
        <Route path="/products" element={<Products />} />
        <Route path="/addproduct" element={<AddProduct/>} />
        <Route path="/products/edit/:id" element={<EditProduct />} />
        <Route path="/addservice" element={<AddService/>} />
        <Route path="/services/edit/:id" element={<EditService/>} />
        <Route path="/services" element={<Service/>} />
        <Route path="/addcourse" element={<AddCourse/>} />
        <Route path="/Courses" element={<Courses/>} />
        <Route path="/courses/edit/:id" element={<EditCourse />} />
        <Route path="/service-requests" element={<ServiceRequests/>} />
        <Route path="/technical-offers/:offerId" element={<TechnicalOfferPage />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;