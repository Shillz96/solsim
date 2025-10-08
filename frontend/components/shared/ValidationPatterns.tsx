'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

/**
 * Types of validation patterns demonstrated in this component
 */
type ValidationType = 'basic' | 'multi-field' | 'async' | 'conditional';

/**
 * Schema for basic validation
 */
const basicSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  age: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().int().positive().min(18, 'You must be at least 18 years old').optional()
  ),
});

/**
 * Schema for multi-field validation
 */
const multiFieldSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

/**
 * Schema for conditional validation
 */
const conditionalSchema = z.object({
  contactMethod: z.enum(['email', 'phone', 'mail']),
  email: z.string().email('Please enter a valid email').optional(),
  phone: z.string().regex(/^\d{10}$/, 'Please enter a 10-digit phone number').optional(),
  address: z.string().min(10, 'Please enter a complete address').optional(),
}).refine(
  (data) => {
    if (data.contactMethod === 'email') return !!data.email;
    if (data.contactMethod === 'phone') return !!data.phone;
    if (data.contactMethod === 'mail') return !!data.address;
    return true;
  },
  {
    message: 'Please provide the required contact information',
    path: ['contactMethod'],
  }
);

/**
 * Props for the ValidationPatterns component
 */
interface ValidationPatternsProps {
  onSubmitForm?: (data: any) => Promise<void>;
  className?: string;
}

/**
 * ValidationPatterns component demonstrating different validation techniques
 * 
 * Showcases:
 * 1. Basic validation (required fields, type validation)
 * 2. Multi-field validation (field comparisons)
 * 3. Async validation (server checks)
 * 4. Conditional validation (fields dependent on other inputs)
 */
export function ValidationPatterns({
  onSubmitForm,
  className = '',
}: ValidationPatternsProps) {
  const [validationType, setValidationType] = useState<ValidationType>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [asyncValidating, setAsyncValidating] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Create appropriate schema based on selected validation type
  let currentSchema;
  switch (validationType) {
    case 'multi-field':
      currentSchema = multiFieldSchema;
      break;
    case 'conditional':
      currentSchema = conditionalSchema;
      break;
    default:
      currentSchema = basicSchema;
  }

  // Initialize form with selected schema
  const form = useForm({
    resolver: zodResolver(currentSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      age: '',
      password: '',
      confirmPassword: '',
      contactMethod: 'email',
      phone: '',
      address: '',
      username: '',
      agreeToTerms: false,
    },
  });

  // Special handling for async username validation
  const validateUsername = async (username: string) => {
    if (!username || username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    
    setAsyncValidating(true);
    
    // Simulate API call to check username availability
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setAsyncValidating(false);
    
    // Simulate taken usernames for demo purposes
    const takenUsernames = ['admin', 'user', 'test', 'demo', 'system'];
    if (takenUsernames.includes(username.toLowerCase())) {
      return 'This username is already taken';
    }
    
    return true;
  };

  // Form submission handler
  const onSubmit = async (data: any) => {
    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call external handler if provided
      if (onSubmitForm) {
        await onSubmitForm(data);
      }
      
      // Show success state
      setFormState('success');
      
      // Reset after success
      setTimeout(() => {
        setFormState('idle');
        form.reset();
      }, 3000);
    } catch (error) {
      setFormState('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Validation Patterns</CardTitle>
        <CardDescription>
          Demonstrating various form validation techniques
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Select 
            value={validationType} 
            onValueChange={(value: ValidationType) => {
              setValidationType(value);
              form.reset();
              setFormState('idle');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select validation type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic Validation</SelectItem>
              <SelectItem value="multi-field">Multi-field Validation</SelectItem>
              <SelectItem value="async">Async Validation</SelectItem>
              <SelectItem value="conditional">Conditional Validation</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            {validationType === 'basic' && 'Simple field validation with required fields and type checking'}
            {validationType === 'multi-field' && 'Validation that compares multiple fields'}
            {validationType === 'async' && 'Validation that requires server-side checks'}
            {validationType === 'conditional' && 'Fields that are conditionally required based on other inputs'}
          </p>
        </div>

        {/* Form status alerts */}
        {formState === 'success' && (
          <Alert variant="success" className="mb-4">
            <CheckCircle className="h-4 w-4 mr-2" />
            <AlertDescription>Form submitted successfully!</AlertDescription>
          </Alert>
        )}
        
        {formState === 'error' && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{errorMessage || 'An error occurred. Please try again.'}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Validation Fields */}
            {validationType === 'basic' && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your age" 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>Must be 18 or older if provided</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Multi-field Validation Fields */}
            {validationType === 'multi-field' && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter a password" type="password" {...field} />
                      </FormControl>
                      <FormDescription>Must be at least 8 characters long</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Confirm your password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Async Validation Fields */}
            {validationType === 'async' && (
              <>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="Choose a username" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              form.trigger('username');
                            }}
                          />
                          {asyncValidating && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Try "admin" or "user" to see taken username error
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                  rules={{
                    validate: validateUsername
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="agreeToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I agree to the terms and conditions
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Conditional Validation Fields */}
            {validationType === 'conditional' && (
              <>
                <FormField
                  control={form.control}
                  name="contactMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Contact Method</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset related fields
                          form.resetField('email');
                          form.resetField('phone');
                          form.resetField('address');
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contact method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="mail">Mail</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch('contactMethod') === 'email' && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch('contactMethod') === 'phone' && (
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit phone number" {...field} />
                        </FormControl>
                        <FormDescription>Example: 1234567890</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch('contactMethod') === 'mail' && (
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailing Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter your complete address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
            
            <Button type="submit" disabled={submitting || asyncValidating}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : 'Submit Form'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4 text-sm text-muted-foreground">
        <div>Current validation type: <span className="font-medium">{validationType}</span></div>
        <div>Form state: <span className="font-medium">{formState}</span></div>
      </CardFooter>
    </Card>
  );
}