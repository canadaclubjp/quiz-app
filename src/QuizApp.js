import React, { useState, useEffect } from "react";
import axios from "axios";

export default function QuizApp() {
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [studentNumber, setStudentNumber] = useState("");
    const [firstNameEnglish, setFirstNameEnglish] = useState("");
    const [lastNameEnglish, setLastNameEnglish] = useState("");
    const [courseNumber, setCourseNumber] = useState("");
    const [quizId, setQuizId] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [isStudentIdEntered, setIsStudentIdEntered] = useState(false);
    const [score, setScore] = useState(null);
    const [total, setTotal] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const quizIdFromUrl = urlParams.get("quizId");
        const courseNum = urlParams.get("courseNumber");
        if (quizIdFromUrl && courseNum) {
            setQuizId(quizIdFromUrl);
            setCourseNumber(courseNum);
        }
    }, []);

    const fetchQuiz = async () => {
        if (!studentNumber || !firstNameEnglish || !lastNameEnglish || !courseNumber || !quizId) {
            setError("Please enter your student number, first name, last name, and ensure quiz parameters are provided.");
            return;
        }
        const url = `https://quiz-app-backend-jp.fly.dev/quiz/${parseInt(quizId)}?student_number=${studentNumber}&course_number=${courseNumber}`;
        try {
            const response = await axios.get(url);
            if (response.data.message === "You have already taken this quiz.") {
                setSubmitted(true);
                setScore(response.data.score);
                setTotal(response.data.total);
                setIsStudentIdEntered(true);
                setQuiz({ title: "Quiz Already Taken" });
                return;
            }
            setQuiz(response.data);
            setIsStudentIdEntered(true);
            setError(null);

            const hasAudioOrVideo = response.data.questions.some((q) => q.audio_url || q.video_url);
            const initialTime = hasAudioOrVideo ? 10 * 60 : 5 * 60;
            setTimeLeft(initialTime);
        } catch (err) {
            console.error("Error fetching quiz:", err);
            setError(err.response?.data?.detail || err.message);
        }
    };

    useEffect(() => {
        if (timeLeft === null || submitted) return;
        if (timeLeft <= 0) {
            submitQuiz();
            return;
        }
        const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, submitted]);

    const handleTextInput = (questionId, value) => {
        console.log(`Q${questionId} - Text Input:`, value);
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const handleCheckbox = (questionId, value) => {
        const cleanValue = value.includes(": ") ? value.split(": ")[1].trim() : value.trim();
        console.log(`Q${questionId} - Checkbox: Raw=${value}, Clean=${cleanValue}`);
        setAnswers((prev) => {
            const currentAnswers = Array.isArray(prev[questionId]) ? prev[questionId] : [];
            if (currentAnswers.includes(cleanValue)) {
                return { ...prev, [questionId]: currentAnswers.filter((ans) => ans !== cleanValue) };
            } else {
                return { ...prev, [questionId]: [...currentAnswers, cleanValue] };
            }
        });
    };

    const submitQuiz = async () => {
        if (!studentNumber || !firstNameEnglish || !lastNameEnglish) {
            setError("Student number, first name, and last name are required.");
            return;
        }
        const submitUrl = `https://quiz-app-backend-jp.fly.dev/submit_quiz/${parseInt(quizId)}`;
        const submission = {
            student_number: studentNumber,
            first_name_english: firstNameEnglish,
            last_name_english: lastNameEnglish,
            course_number: courseNumber,
            answers: Object.keys(answers).reduce((acc, qId) => {
                acc[qId] = answers[qId];
                return acc;
            }, {})
        };
        try {
            const response = await axios.post(submitUrl, submission);
            setScore(response.data.score);
            setTotal(response.data.total);
            setSubmitted(true);
            setError(null);
        } catch (err) {
            console.error("Error submitting quiz:", err);
            setError(err.response?.data?.detail || err.message);
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const getDirectGoogleDriveUrl = (url) => {
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
            return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
        return url;
    };

    if (error) return <div style={{ textAlign: "center", color: "red", padding: "20px" }}>Error: {error}</div>;

    if (!isStudentIdEntered) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", minHeight: "100vh", backgroundColor: "#f9f9f9" }}>
                <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" }}>
                    <h1 style={{ marginBottom: "20px", textAlign: "center", color: "#333" }}>Enter Student Information</h1>
                    <input
                        type="text"
                        placeholder="Student Number (required)"
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        required
                        style={{
                            marginBottom: "15px",
                            width: "100%",
                            padding: "10px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            fontSize: "16px",
                            boxSizing: "border-box",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="First Name (English) (required)"
                        value={firstNameEnglish}
                        onChange={(e) => setFirstNameEnglish(e.target.value)}
                        required
                        style={{
                            marginBottom: "15px",
                            width: "100%",
                            padding: "10px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            fontSize: "16px",
                            boxSizing: "border-box",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Last Name (English) (required)"
                        value={lastNameEnglish}
                        onChange={(e) => setLastNameEnglish(e.target.value)}
                        required
                        style={{
                            marginBottom: "15px",
                            width: "100%",
                            padding: "10px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            fontSize: "16px",
                            boxSizing: "border-box",
                        }}
                    />
                    <button
                        onClick={fetchQuiz}
                        style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "16px",
                        }}
                    >
                        Start Quiz
                    </button>
                </div>
            </div>
        );
    }

    if (!quiz) return <div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", minHeight: "100vh", backgroundColor: "#f9f9f9" }}>
            <h1 style={{ marginBottom: "20px", textAlign: "center", color: "#333" }}>{quiz.title}</h1>
            {!submitted ? (
                <>
                    <div style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "bold", color: "#555" }}>
                        Time Left: {formatTime(timeLeft)}
                    </div>
                    {quiz.questions.map((q) => (
                        <div
                            key={q.id}
                            style={{
                                backgroundColor: "#fff",
                                padding: "20px",
                                marginBottom: "15px",
                                width: "100%",
                                maxWidth: "600px",
                                borderRadius: "8px",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                        >
                            <h3 style={{ marginBottom: "15px", color: "#333" }}>{q.question_text}</h3>
                            {q.image_url && (
                                <img
                                    src={
                                        q.image_url.includes("drive.google.com")
                                            ? getDirectGoogleDriveUrl(q.image_url)
                                            : q.image_url
                                    }
                                    alt="Question media"
                                    style={{ maxWidth: "100%", borderRadius: "4px", marginBottom: "15px" }}
                                />
                            )}
                            {q.audio_url && (
                                <audio controls style={{ width: "100%", marginBottom: "15px" }}>
                                    <source
                                        src={
                                            q.audio_url.includes("drive.google.com")
                                                ? getDirectGoogleDriveUrl(q.audio_url)
                                                : q.audio_url
                                        }
                                        type="audio/mpeg"
                                    />
                                    Your browser does not support the audio element.
                                </audio>
                            )}
                            {q.video_url && (
                                <video controls style={{ maxWidth: "100%", borderRadius: "4px", marginBottom: "15px" }}>
                                    <source
                                        src={
                                            q.video_url.includes("catbox.moe")
                                                ? q.video_url
                                                : getDirectGoogleDriveUrl(q.video_url)
                                        }
                                    />
                                    Your browser does not support the video element.
                                </video>
                            )}
                            {q.is_text_input ? (
                                <input
                                    type="text"
                                    value={answers[q.id] || ""}
                                    onChange={(e) => handleTextInput(q.id, e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        fontSize: "16px",
                                        boxSizing: "border-box",
                                        marginBottom: "15px",
                                    }}
                                />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                                    {q.options.map((opt, index) => {
                                        const cleanOpt = opt.includes(": ") ? opt.split(": ")[1].trim() : opt.trim();
                                        return (
                                            <label
                                                key={index}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    margin: "8px 0",
                                                    width: "100%",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={answers[q.id]?.includes(cleanOpt) || false}
                                                    onChange={() => handleCheckbox(q.id, opt)}
                                                    style={{ marginRight: "10px", flexShrink: "0" }}
                                                />
                                                <span style={{ flexGrow: "1", fontSize: "16px", color: "#333" }}>{opt}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={submitQuiz}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "16px",
                            marginTop: "20px",
                        }}
                    >
                        Submit Quiz
                    </button>
                </>
            ) : (
                <div style={{ textAlign: "center", backgroundColor: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                    <h2 style={{ color: "#333" }}>Quiz Submitted!</h2>
                    <p style={{ fontSize: "16px", color: "#555" }}>
                        Your score: {score}/{total}
                    </p>
                </div>
            )}
        </div>
    );
}
