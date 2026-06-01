import * as calendarService from '../services/calendarService.js';
import AppError from '../utils/appError.js';

const ts = () => new Date().toISOString();

const ensureSchool = (req) => {
  if (req.user?.role !== 'SCHOOL') {
    throw new AppError('This endpoint is only available for SCHOOL organizations', 403);
  }
};

export const listEventsController = async (req, res, next) => {
  try {
    ensureSchool(req);
    const events = await calendarService.listEvents(req.user.id, req.query);
    return res.status(200).json({ success: true, status: 200, data: events, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};

export const createEventController = async (req, res, next) => {
  try {
    ensureSchool(req);
    const event = await calendarService.createEvent(req.user.id, req.user.id, req.body);
    return res.status(201).json({ success: true, status: 201, data: event, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};

export const getEventController = async (req, res, next) => {
  try {
    ensureSchool(req);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return next(new AppError('Invalid event id', 400));
    const event = await calendarService.getEvent(req.user.id, id);
    return res.status(200).json({ success: true, status: 200, data: event, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};

export const updateEventController = async (req, res, next) => {
  try {
    ensureSchool(req);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return next(new AppError('Invalid event id', 400));
    const event = await calendarService.updateEvent(req.user.id, id, req.body);
    return res.status(200).json({ success: true, status: 200, data: event, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};

export const listPublicEventsController = async (req, res, next) => {
  try {
    const events = await calendarService.listPublicEvents(req.user.id, req.user.role, req.query);
    return res.status(200).json({ success: true, status: 200, data: events, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};

export const deleteEventController = async (req, res, next) => {
  try {
    ensureSchool(req);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return next(new AppError('Invalid event id', 400));
    const result = await calendarService.deleteEvent(req.user.id, id);
    return res.status(200).json({ success: true, status: 200, data: result, error: null, timestamp: ts() });
  } catch (err) { next(err); }
};
