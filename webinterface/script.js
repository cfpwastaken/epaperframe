const info = await fetch("info").then(res => res.json());
document.querySelector("#album").innerText = "from " + info.album;
const countDownDate = new Date(info.next).getTime();
const start = new Date().getTime();
const x = setInterval(function() {
  var now = new Date().getTime();

  var distance = countDownDate - now;
	const percentage = Math.min(100 - (distance / (countDownDate - start)) * 100, 100);

  var days = Math.floor(distance / (1000 * 60 * 60 * 24));
  var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.querySelector("#next").innerText = (days > 0 ? days + "d " : "") + (hours > 0 ? hours + "h " : "")
  + (minutes > 0 ? minutes + "m " : "") + (seconds > 0 ? seconds + "s" : "");
	document.querySelector("#card-next .progress-bar .bar").style.width = percentage + "%";

  if (distance < 0) {
    clearInterval(x);
    document.querySelector("#next").innerText = "Refreshing...";
		setTimeout(() => {location.reload()}, 60000);
  }
}, 1000);