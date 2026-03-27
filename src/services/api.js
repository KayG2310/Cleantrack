import axios from "axios";

const API = axios.create({
  baseURL: "http://172.27.11.131:3000", 
});

export default API;