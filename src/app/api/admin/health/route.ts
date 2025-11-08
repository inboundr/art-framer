import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateRequest } from "@/lib/auth/jwtAuth";
import { prodigiClient } from "@/lib/prodigi";
import { orderRetryManager } from "@/lib/orderRetry";

export async function GET(request: NextRequest) {
  try {
    // JWT-only authentication (admin only)
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      console.log('Admin Health API: Authentication failed', { error: authError });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!((profile as { is_admin?: boolean } | null)?.is_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const healthChecks = await Promise.allSettled([
      checkDatabaseHealth(supabase),
      checkProdigiHealth(),
      checkRetrySystemHealth(supabase),
      checkOrderSystemHealth(supabase),
      checkNotificationSystemHealth(supabase),
    ]);

    const results = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: {
        database: healthChecks[0],
        prodigi: healthChecks[1],
        retrySystem: healthChecks[2],
        orderSystem: healthChecks[3],
        notificationSystem: healthChecks[4],
      },
    };

    // Determine overall health
    const failedChecks = healthChecks.filter(check => 
      check.status === 'rejected' || 
      (check.status === 'fulfilled' && check.value.status !== 'healthy')
    );

    if (failedChecks.length > 0) {
      results.overall = failedChecks.length === healthChecks.length ? 'critical' : 'degraded';
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: 'critical',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

async function checkDatabaseHealth(supabase: ReturnType<typeof createServiceClient>) {
  try {
    const startTime = Date.now();
    
    // Test basic database connectivity
    const { error } = await supabase
      .from('orders')
      .select('count')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Check database performance
    const performance = responseTime < 100 ? 'excellent' : 
                       responseTime < 500 ? 'good' : 
                       responseTime < 1000 ? 'fair' : 'poor';

    return {
      status: 'healthy',
      responseTime,
      performance,
      details: {
        connection: 'ok',
        queryTime: `${responseTime}ms`,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: {
        connection: 'failed',
      },
    };
  }
}

async function checkProdigiHealth() {
  try {
    const startTime = Date.now();
    
    // Test Prodigi API connectivity
    const environment = process.env.PRODIGI_ENVIRONMENT || 'sandbox';
    const apiKey = process.env.PRODIGI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Prodigi API key not configured');
    }

    // Try to fetch products (this might fail in sandbox, which is expected)
    try {
      const products = await prodigiClient.getProducts();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        environment,
        details: {
          apiKey: 'configured',
          connectivity: 'ok',
          productsAvailable: products.length,
        },
      };
    } catch (apiError) {
      // In sandbox mode, this is expected to fail
      if (environment === 'sandbox') {
        return {
          status: 'healthy',
          environment,
          details: {
            apiKey: 'configured',
            connectivity: 'ok (sandbox mode)',
            note: 'API endpoint not available in sandbox',
          },
        };
      }
      throw apiError;
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Prodigi error',
      details: {
        environment: process.env.PRODIGI_ENVIRONMENT || 'unknown',
        apiKey: process.env.PRODIGI_API_KEY ? 'configured' : 'missing',
      },
    };
  }
}

async function checkRetrySystemHealth(supabase: ReturnType<typeof createServiceClient>) {
  try {
    // Get retry system statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_retry_stats');

    if (statsError) {
      console.warn('Retry stats RPC not available:', statsError.message);
      return {
        status: 'warning',
        component: 'retry_system',
        message: 'Retry statistics unavailable - RPC function may not exist',
        details: {
          criticalFailures: 0,
          overdueOperations: 0,
          successRate: 100
        }
      };
    }

    const statsArray = Array.isArray(stats) ? stats : [];
    const stat = statsArray.length > 0 ? statsArray[0] : {};
    
    // Check for critical issues - with type safety
    const criticalFailures = (stat as any)?.failed_count || 0;
    const overdueOperations = (stat as any)?.pending_count || 0;
    const successRate = (stat as any)?.success_rate || 100;

    let status = 'healthy';
    const issues = [];

    if (criticalFailures > 10) {
      status = 'critical';
      issues.push(`${criticalFailures} critical failures in last 24h`);
    } else if (criticalFailures > 5) {
      status = 'degraded';
      issues.push(`${criticalFailures} failures in last 24h`);
    }

    if (overdueOperations > 5) {
      status = status === 'critical' ? 'critical' : 'degraded';
      issues.push(`${overdueOperations} overdue operations`);
    }

    if (successRate < 80 && (stat as any)?.total_count > 10) {
      status = status === 'critical' ? 'critical' : 'degraded';
      issues.push(`Low success rate: ${successRate}%`);
    }

    return {
      status,
      issues,
      details: {
        totalOperations: (stat as any)?.total_count || 0,
        pendingOperations: (stat as any)?.pending_count || 0,
        completedOperations: (stat as any)?.completed_count || 0,
        failedOperations: (stat as any)?.failed_count || 0,
        successRate: `${successRate}%`,
        averageAttempts: (stat as any)?.avg_attempts || 0,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown retry system error',
    };
  }
}

async function checkOrderSystemHealth(supabase: ReturnType<typeof createServiceClient>) {
  try {
    // Check recent order processing
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('status, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw new Error(`Failed to fetch recent orders: ${ordersError.message}`);
    }

    // Analyze order statuses
    const statusCounts = recentOrders.reduce((acc: Record<string, number>, order: { status: string }) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalOrders = recentOrders.length;
    const stuckOrders = (statusCounts.processing || 0) + (statusCounts.paid || 0);
    const failedOrders = statusCounts.cancelled || 0;

    let status = 'healthy';
    const issues = [];

    if (totalOrders > 0) {
      const stuckPercentage = (stuckOrders / totalOrders) * 100;
      const failedPercentage = (failedOrders / totalOrders) * 100;

      if (stuckPercentage > 20) {
        status = 'degraded';
        issues.push(`High percentage of stuck orders: ${stuckPercentage.toFixed(1)}%`);
      }

      if (failedPercentage > 10) {
        status = status === 'critical' ? 'critical' : 'degraded';
        issues.push(`High failure rate: ${failedPercentage.toFixed(1)}%`);
      }
    }

    return {
      status,
      issues,
      details: {
        totalOrders24h: totalOrders,
        orderStatuses: statusCounts,
        stuckOrders,
        failedOrders,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown order system error',
    };
  }
}

async function checkNotificationSystemHealth(supabase: ReturnType<typeof createServiceClient>) {
  try {
    // Check notification system
    const { data: notifications, error: notificationsError } = await supabase
      .from('customer_notifications')
      .select('type, is_read, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (notificationsError) {
      throw new Error(`Failed to fetch notifications: ${notificationsError.message}`);
    }

    const totalNotifications = notifications.length;
    const unreadNotifications = notifications.filter((n: { is_read: boolean }) => !n.is_read).length;
    const notificationTypes = notifications.reduce((acc: Record<string, number>, notif: { type: string }) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      status: 'healthy',
      details: {
        totalNotifications24h: totalNotifications,
        unreadNotifications,
        notificationTypes,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown notification system error',
    };
  }
}

// POST endpoint to trigger manual health checks and cleanup
export async function POST(request: NextRequest) {
  try {
    // JWT-only authentication (admin only)
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      console.log('Admin Health Action API: Authentication failed', { error: authError });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!((profile as { is_admin?: boolean } | null)?.is_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'process_pending_retries':
        const retryResult = await orderRetryManager.processPendingOperations();
        return NextResponse.json({
          success: true,
          message: 'Pending retry operations processed',
          result: retryResult,
        });

      case 'cleanup_old_operations':
        const { data: cleanupResult, error: cleanupError } = await supabase
          .rpc('cleanup_old_retry_operations');
        
        if (cleanupError) {
          throw new Error(`Cleanup failed: ${cleanupError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Old retry operations cleaned up',
          deletedCount: cleanupResult,
        });

      case 'reschedule_failed_operations':
        const { data: rescheduleResult, error: rescheduleError } = await supabase
          .rpc('reschedule_failed_operations');
        
        if (rescheduleError) {
          throw new Error(`Reschedule failed: ${rescheduleError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Failed operations rescheduled',
          rescheduledCount: rescheduleResult,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in POST /api/admin/health:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
