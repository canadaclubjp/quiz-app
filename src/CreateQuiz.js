import React, { useState, useEffect } from "react";
import styles from "./QuizApp.module.css";

export default function EditQuiz({ quizId, onSave }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (quizId) {
      fetch(`http://localhost:8000/quiz/${quizId}`)
        .then((res) => res.json())
        .then((data) => {
          setTitle(data.title);
          setDescription(data.description);
          setQuestions(data.questions.map((q) => ({
            question_text: q.question_text,
            options: q.options || [""],
            correct_answers: q.correct_answers.map((ans) => q.options.indexOf(ans)), // Convert to indices
            is_text_input: q.is_text_input,
            image_url: q.image_url?.includes("proxy_media") ? q.image_url.split("url=")[1] : q.image_url,
            audio_url: q.audio_url?.includes("proxy_media") ? q.audio_url.split("url=")[1] : q.audio_url,
            video_url: q.video_url?.includes("proxy_media") ? q.video_url.split("url=")[1] : q.video_url,
            text_answers: q.is_text_input ? q.correct_answers.join(", ") : ""
          })));
        })
        .catch((err) => console.error("Error fetching quiz:", err));
    }
  }, [quizId]);

  // Reuse logic from CreateQuiz.js (addQuestion, updateQuestion, etc.)
  const addQuestion = () => {
    setQuestions([...questions, { question_text: "", options: [""], correct_answers: [], is_text_input: false, image_url: "", audio_url: "", video_url: "" }]);
  };

  const updateQuestion = (index, key, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][key] = value;
    setQuestions(updatedQuestions);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options[optIndex] = value;
    setQuestions(updatedQuestions);
  };

  const addOption = (qIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options.push("");
    setQuestions(updatedQuestions);
  };

  const removeOption = (qIndex, optIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options.splice(optIndex, 1);
    setQuestions(updatedQuestions);
  };

  const updateTextInputAnswers = (qIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].text_answers = value;
    setQuestions(updatedQuestions);
  };

  const toggleCorrectAnswer = (qIndex, optIndex) => {
    const updatedQuestions = [...questions];
    const correctAnswers = updatedQuestions[qIndex].correct_answers;
    if (correctAnswers.includes(optIndex)) {
      updatedQuestions[qIndex].correct_answers = correctAnswers.filter((i) => i !== optIndex);
    } else {
      updatedQuestions[qIndex].correct_answers.push(optIndex);
    }
    setQuestions(updatedQuestions);
  };

  const toggleTextInput = (qIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].is_text_input = !updatedQuestions[qIndex].is_text_input;
    if (updatedQuestions[qIndex].is_text_input) {
      updatedQuestions[qIndex].correct_answers = [];
    }
    setQuestions(updatedQuestions);
  };

  const saveQuiz = async () => {
    const formattedQuestions = questions.map((q) => ({
      question_text: q.question_text,
      options: q.is_text_input ? null : q.options.filter((opt) => opt !== ""),
      correct_answers: q.is_text_input
        ? q.text_answers ? q.text_answers.split(",").map((ans) => ans.trim()) : []
        : q.correct_answers.map((idx) => q.options[idx]),
      is_text_input: q.is_text_input,
      image_url: q.image_url || null,
      audio_url: q.audio_url || null,
      video_url: q.video_url || null,
    }));

    const quizData = { title, description, questions: formattedQuestions };
    try {
      const response = await fetch(`http://localhost:8000/quiz/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizData),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log("✅ Quiz Updated:", data);
      alert("Quiz updated successfully!");
      onSave(); // Callback to refresh or close
    } catch (err) {
      console.error("❌ Error updating quiz:", err);
      alert("Failed to update quiz.");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "20px", textAlign: "center" }}>
      <h2>Edit Quiz (ID: {quizId})</h2>
      <input type="text" placeholder="Quiz Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
      <textarea placeholder="Quiz Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />

      {questions.map((q, qIndex) => (
        <div key={qIndex} style={{ border: "1px solid gray", padding: "10px", marginBottom: "10px" }}>
          <input type="text" placeholder={`Question ${qIndex + 1}`} value={q.question_text} onChange={(e) => updateQuestion(qIndex, "question_text", e.target.value)} style={{ width: "100%", padding: "5px", marginBottom: "5px" }} />
          <label>
            Text Input:
            <input type="checkbox" checked={q.is_text_input} onChange={() => toggleTextInput(qIndex)} />
          </label>
          {q.is_text_input && (
            <input
              type="text"
              placeholder="Correct Answer(s), separated by commas"
              value={q.text_answers || ""}
              onChange={(e) => updateTextInputAnswers(qIndex, e.target.value)}
              style={{ width: "100%", padding: "5px", marginBottom: "5px" }}
            />
          )}
          {!q.is_text_input && q.options.map((opt, optIndex) => (
            <div key={optIndex}>
              <input type="text" placeholder={`Option ${optIndex + 1}`} value={opt} onChange={(e) => updateOption(qIndex, optIndex, e.target.value)} style={{ width: "80%", padding: "5px", marginBottom: "5px" }} />
              <button type="button" onClick={() => toggleCorrectAnswer(qIndex, optIndex)}>
                {q.correct_answers.includes(optIndex) ? "✅" : "⬜"}
              </button>
              <button type="button" onClick={() => removeOption(qIndex, optIndex)}>
                -
              </button>
            </div>
          ))}
          {!q.is_text_input && (
            <button type="button" onClick={() => addOption(qIndex)}>
              + Add Option
            </button>
          )}
          <input type="text" placeholder="Image URL" value={q.image_url || ""} onChange={(e) => updateQuestion(qIndex, "image_url", e.target.value)} style={{ width: "100%", padding: "5px", marginBottom: "5px" }} />
          <input type="text" placeholder="Audio URL" value={q.audio_url || ""} onChange={(e) => updateQuestion(qIndex, "audio_url", e.target.value)} style={{ width: "100%", padding: "5px", marginBottom: "5px" }} />
          <input type="text" placeholder="Video URL" value={q.video_url || ""} onChange={(e) => updateQuestion(qIndex, "video_url", e.target.value)} style={{ width: "100%", padding: "5px", marginBottom: "5px" }} />
        </div>
      ))}

      <button onClick={addQuestion} style={{ margin: "10px", padding: "10px", backgroundColor: "green", color: "white", border: "none", cursor: "pointer" }}>
        ➕ Add Question
      </button>
      <button onClick={saveQuiz} style={{ margin: "10px", padding: "10px", backgroundColor: "blue", color: "white", border: "none", cursor: "pointer" }}>
        💾 Save Changes
      </button>
    </div>
  );
}