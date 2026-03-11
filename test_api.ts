import axios from "axios";

async function test() {
  try {
    const res = await axios.get("http://localhost:3000/api/openf1/car_data?driver_number=1&session_key=9158&date%3E=2023-09-15T09:35:00");
    console.log("Success, length:", res.data.length);
  } catch (err: any) {
    console.error("Error:", err.response ? err.response.status : err.message, err.response?.data);
  }
}
test();
