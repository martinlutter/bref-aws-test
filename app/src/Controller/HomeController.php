<?php

declare(strict_types=1);

namespace App\Controller;

use Aws\CommandPool;
use Aws\Lambda\LambdaClient;
use Aws\ResultInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class HomeController extends AbstractController
{
    public function __construct(
        #[Autowire(env: 'DEV_KEY')]
        private readonly string $awsAccessKeyId,
        #[Autowire(env: 'DEV_SECRET_KEY')]
        private readonly string $awsSecretAccessKey,
        #[Autowire(env: 'APP_ENV')]
        private readonly string $environment,
        #[Autowire(env: 'LAMBDA_ARN')]
        private readonly string $lambdaArn,
    ) {
    }

    #[Route('/{number}', requirements: ['number' => '\d+'])]
    public function index(int $number): Response
    {
        $time = microtime(true);
        $lambdaClient = new LambdaClient([
            'version' => 'latest',
            'region' => 'eu-west-2',
            'credentials' => $this->environment !== 'prod' ? [
                'key' => $this->awsAccessKeyId,
                'secret' => $this->awsSecretAccessKey,
            ] : null,
        ]);

        $commands = [];
        for ($i = 0; $i < $number; $i++) {
            $commands[] = $lambdaClient->getCommand('invoke', [
                'FunctionName' => $this->lambdaArn,
                'Payload' => json_encode(['key' => $i]),
            ]);
        }

        $pool = new CommandPool($lambdaClient, $commands, [
            'concurrency' => 10,
            'fulfilled' => function (ResultInterface $result) {
                // This is delivered each time a command completes
                // $result['Payload'] is a stream, so we need to cast it to a string
                dump($result->get('Payload')->__toString());
            }
        ]);

        $pool->promise()->wait();

        return new Response((string) (microtime(true) - $time));
    }
}