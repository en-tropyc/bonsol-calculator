import React from 'react';

const SimpleCalculator: React.FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🧮 Simple Calculator Test</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ margin: '20px' }}>
        <input type="number" defaultValue={15} style={{ margin: '5px', padding: '5px' }} />
        <span> + </span>
        <input type="number" defaultValue={25} style={{ margin: '5px', padding: '5px' }} />
        <span> = 40</span>
      </div>
      <button style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none' }}>
        Calculate
      </button>
    </div>
  );
};

export default SimpleCalculator; 
