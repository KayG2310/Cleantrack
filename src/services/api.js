import axios from "axios";

const API = axios.create({
  baseURL: "http://172.27.8.127:3000", 
});

export default API;