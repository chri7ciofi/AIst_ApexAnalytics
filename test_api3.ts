import axios from "axios";

async function test() {
  try {
    const sessionKey = 9158;
    const driver1 = 1;
    const driver2 = 16;
    
    const [laps1Res, laps2Res] = await Promise.all([
      axios.get(`http://localhost:3000/api/openf1/laps?session_key=${sessionKey}&driver_number=${driver1}`),
      axios.get(`http://localhost:3000/api/openf1/laps?session_key=${sessionKey}&driver_number=${driver2}`)
    ]);
    
    const validLaps1 = laps1Res.data.filter((l: any) => l.lap_duration != null);
    const validLaps2 = laps2Res.data.filter((l: any) => l.lap_duration != null);
    
    const fastestLap1 = validLaps1.reduce((min: any, p: any) => p.lap_duration < min.lap_duration ? p : min, validLaps1[0]);
    const fastestLap2 = validLaps2.reduce((min: any, p: any) => p.lap_duration < min.lap_duration ? p : min, validLaps2[0]);
    
    console.log("fastestLap1", fastestLap1.date_start, fastestLap1.lap_duration);
    console.log("fastestLap2", fastestLap2.date_start, fastestLap2.lap_duration);
    
    const endTime1 = new Date(new Date(fastestLap1.date_start).getTime() + fastestLap1.lap_duration * 1000).toISOString();
    const endTime2 = new Date(new Date(fastestLap2.date_start).getTime() + fastestLap2.lap_duration * 1000).toISOString();
    
    console.log("endTime1", endTime1);
    console.log("endTime2", endTime2);
    
    const url1 = `http://localhost:3000/api/openf1/car_data?driver_number=${driver1}&session_key=${sessionKey}&date>=${fastestLap1.date_start}&date<=${endTime1}`;
    const url2 = `http://localhost:3000/api/openf1/car_data?driver_number=${driver2}&session_key=${sessionKey}&date>=${fastestLap2.date_start}&date<=${endTime2}`;
    
    console.log("url1", url1);
    console.log("url2", url2);
    
    const [res1, res2] = await Promise.all([
      axios.get(url1),
      axios.get(url2)
    ]);
    
    console.log("res1", res1.data.length);
    console.log("res2", res2.data.length);
    
  } catch (err: any) {
    console.error("Error:", err.response ? err.response.status : err.message, err.response?.data);
  }
}
test();
