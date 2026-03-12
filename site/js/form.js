(function() {
  var form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    var data = new FormData(form);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString()
    })
    .then(function(res) {
      if (res.ok) {
        form.style.display = "none";
        document.getElementById("form-success").style.display = "block";
      }
    })
    .catch(function() {
      alert("Something went wrong. Please call one of the providers directly.");
    });
  });
})();
