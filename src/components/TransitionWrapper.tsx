import { useState, useEffect, ReactElement } from 'react';
import { useLocation } from 'react-router-dom';

interface TransitionWrapperProps {
  children: ReactElement;
}

function TransitionWrapper({ children }: TransitionWrapperProps) {
  const [displayChildren, setDisplayChildren] = useState<ReactElement>(children);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== (displayChildren.props as { pathname?: string }).pathname) {
      setDisplayChildren(children);
    }
  }, [location, children, displayChildren.props]);

  return (
    <div className="page-content">
      {displayChildren}
    </div>
  );
}

export default TransitionWrapper;
