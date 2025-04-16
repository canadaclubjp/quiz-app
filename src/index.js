import React from 'react';
import { createRoot } from 'react-dom/client'; // Updated import
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuizApp from './QuizApp';
import AdminQuizApp from './AdminQuizApp';

const root = createRoot(document.getElementById('root')); // Create root
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<QuizApp />} />
      <Route path="/quiz" element={<QuizApp />} />
      <Route path="/admin" element={<AdminQuizApp />} />
    </Routes>
  </BrowserRouter>
);