import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const fullNameRegex = /^[А-Яа-яЁё\s-]+$/;

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+=\-]).{8,}$/;

export const passwordMeetsRules = (password: string) => passwordRegex.test(password);
