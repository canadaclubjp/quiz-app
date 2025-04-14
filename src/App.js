import React, { useState } from "react";
import QuizApp from "./QuizApp"; // ✅ Import QuizApp
import CreateQuiz from "./CreateQuiz"; // ✅ Import CreateQuiz
import styles from "./QuizApp.module.css"; // ✅ Keep styles

export default function App() {
  const [view, setView] = useState("quiz");

  return (
    <div>
      <nav style={{ display: "flex", justifyContent: "center", padding: "10px", background: "gray" }}>
        <button onClick={() => setView("quiz")} style={{ marginRight: "10px", padding: "10px" }}>
          📖 Take Quiz
        </button>
        <button onClick={() => setView("create")} style={{ padding: "10px" }}>
          ✏️ Create Quiz
        </button>
      </nav>

      {/* ✅ Load either the QuizApp or CreateQuiz based on user selection */}
      {view === "quiz" ? <QuizApp /> : <CreateQuiz />}
    </div>
  );
}
