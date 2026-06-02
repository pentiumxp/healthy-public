function publicError(error) {
  return {
    ok: false,
    error: {
      code: error.code || "internal_error",
      message: error.expose ? error.message : safeMessage(error)
    }
  };
}

function safeMessage(error) {
  if (error.code) return error.message;
  return "request failed";
}

function inputError(message, code = "invalid_input") {
  return Object.assign(new Error(message), { code, expose: true });
}

module.exports = { inputError, publicError };

