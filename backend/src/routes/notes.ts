// Notes API routes
import { FastifyInstance } from 'fastify';
import { NoteService } from '../services/noteService.js';
import prisma from '../plugins/prisma.js';

// Setup routes
export default async function notesRoutes(app: FastifyInstance) {
  const noteService = new NoteService(prisma);

  // GET /api/notes - Get notes for a user
  app.get('/api/notes', {
    schema: {
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          tokenAddress: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { userId, tokenAddress } = request.query as { userId: string; tokenAddress?: string };
        
        const notes = await noteService.getUserNotes(userId, tokenAddress);
        
        return reply.send({ notes });
      } catch (error) {
        console.error('Error fetching notes:', error);
        return reply.status(500).send({ error: 'Failed to fetch notes' });
      }
    }
  });

  // POST /api/notes - Create a new note
  app.post('/api/notes', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'tokenAddress', 'title', 'content'],
        properties: {
          userId: { type: 'string' },
          tokenAddress: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          sentiment: { type: 'string', enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
          isPrivate: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const noteData = request.body as any;
        
        const note = await noteService.createNote(noteData);
        
        return reply.status(201).send({ success: true, note });
      } catch (error) {
        console.error('Error creating note:', error);
        return reply.status(500).send({ error: 'Failed to create note' });
      }
    }
  });

  // PUT /api/notes/:id - Update a note
  app.put('/api/notes/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          sentiment: { type: 'string', enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
          isPrivate: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const updateData = request.body as any;
        
        const note = await noteService.updateNote(id, updateData);
        
        return reply.send({ success: true, note });
      } catch (error) {
        console.error('Error updating note:', error);
        return reply.status(500).send({ error: 'Failed to update note' });
      }
    }
  });

  // DELETE /api/notes/:id - Delete a note
  app.delete('/api/notes/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { userId } = request.query as { userId: string };
        
        const success = await noteService.deleteNote(id, userId);
        
        return reply.send({ success, noteId: id });
      } catch (error) {
        console.error('Error deleting note:', error);
        return reply.status(500).send({ error: 'Failed to delete note' });
      }
    }
  });
}