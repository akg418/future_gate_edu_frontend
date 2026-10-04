import { createResourceService } from './resource.service.js';
import http from '../core/http.js';

/**
 * Clients for the publishable content resources. Each is the standard REST
 * client; `lessonService` adds the filter-options endpoint the Lessons page
 * uses to populate its dropdowns.
 */

export const lessonService = {
  ...createResourceService('/lessons'),
  async filterOptions() {
    const { data } = await http.get('/lessons/filter-options');
    return data;
  },
};

export const newsService = createResourceService('/news');
export const eventService = createResourceService('/events');
export const galleryService = createResourceService('/gallery');
export const teacherService = createResourceService('/teachers');
export const calendarService = createResourceService('/calendar');
export const programService = createResourceService('/programs');
export const testimonialService = createResourceService('/testimonials');

/** Lets the admin Content Manager address any content type by key. */
export const contentServices = {
  news: { service: newsService, label: 'News Article', module: 'news' },
  events: { service: eventService, label: 'Event', module: 'events' },
  gallery: { service: galleryService, label: 'Gallery Item', module: 'gallery' },
  teachers: { service: teacherService, label: 'Teacher', module: 'teachers' },
  calendar: { service: calendarService, label: 'Calendar Entry', module: 'calendar' },
  programs: { service: programService, label: 'Academic Program', module: 'programs' },
  testimonials: { service: testimonialService, label: 'Testimonial', module: 'testimonials' },
};
