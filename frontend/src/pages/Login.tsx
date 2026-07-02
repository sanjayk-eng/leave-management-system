import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LoginForm from "@/components/login/LoginForm";
import LoginRightPanel from "@/components/login/LoginRightPanel";

const Login = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <LoginForm />
      <LoginRightPanel />
    </div>
  );
};

export default Login;
