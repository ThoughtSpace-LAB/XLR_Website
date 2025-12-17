import React from 'react';
import Spline from '@splinetool/react-spline';

export default function SplineViewer() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Spline scene="https://prod.spline.design/kg35p8HMxtVW7K1x/scene.splinecode" />
    </div>
  );
}
