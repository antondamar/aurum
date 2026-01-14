import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // If the user is moving forward (PUSH), jump to top
    if (navType !== "POP") {
      window.scrollTo(0, 0);
    }
    // If they go back (POP), we do nothing so the browser can 
    // restore the previous scroll position automatically
  }, [pathname, navType]);

  return null;
};

export default ScrollToTop;